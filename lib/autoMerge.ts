/*
 * Copyright © 2020 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
	EventContext,
	github,
	HandlerStatus,
	log,
	repository,
	secret,
	status,
} from "@atomist/skill";
import { RestEndpointMethodTypes } from "@octokit/plugin-rest-endpoint-methods/dist-types/generated/parameters-and-response-types";
import * as retry from "p-retry";
import { AutoMergeConfiguration } from "./configuration";
import {
	CheckRunConclusion,
	CheckRunStatus,
	PullRequest,
	ReviewState,
	StatusState,
} from "./typings/types";
import { Octokit } from "@octokit/rest"; // eslint-disable-line @typescript-eslint/no-unused-vars

export const AutoMergeLabel = "auto-merge:on-approve";
export const AutoMergeCheckSuccessLabel = "auto-merge:on-check-success";
export const AutoMergeBprSuccessLabel = "auto-merge:on-bpr-success";
export const AutoMergeTag = `[${AutoMergeLabel}]`;
export const AutoMergeCheckSuccessTag = `[${AutoMergeCheckSuccessLabel}]`;
export const AutoMergeBprSuccessTag = `[${AutoMergeBprSuccessLabel}]`;

export const AutoMergeMethodLabel = "auto-merge-method:";
export const AutoMergeMethods: Array<AutoMergeConfiguration["mergeMethod"]> = [
	"merge",
	"rebase",
	"squash",
];
export const AutoMergeMethodLabels = {
	merge: "Auto-merge with merge commit",
	rebase: "Auto-merge with rebase and merge",
	squash: "Auto-merge with squash and merge",
};

function isTagged(msg: string, tag: string): boolean {
	return msg && msg.indexOf(tag) >= 0;
}

function isPrTagged(
	pr: PullRequest,
	label: string = AutoMergeLabel,
	tag: string = AutoMergeTag,
): boolean {
	// 0. check labels
	if (pr.labels && pr.labels.some(l => l.name === label)) {
		return true;
	}

	// 1. check body and title for auto merge marker
	if (isTagged(pr.title, tag) || isTagged(pr.body, tag)) {
		return true;
	}

	// 2. PR comment that contains the merger
	if (pr.comments && pr.comments.some(c => isTagged(c.body, tag))) {
		return true;
	}

	// 3. Commit message containing the auto merge marker
	if (pr.commits && pr.commits.some(c => isTagged(c.message, tag))) {
		return true;
	}

	return false;
}

export function isPrAutoMergeEnabled(pr: PullRequest): boolean {
	return (
		isPrTagged(pr, AutoMergeLabel, AutoMergeTag) ||
		isPrTagged(pr, AutoMergeCheckSuccessLabel, AutoMergeCheckSuccessTag) ||
		isPrTagged(pr, AutoMergeBprSuccessLabel, AutoMergeBprSuccessTag)
	);
}

export interface Check {
	name: string;
	description: string;
	state: StatusState;
	url: string;
	detailsUrl: string;
}

function aggregateChecksAndStatus(pr: PullRequest): Check[] {
	const allChecks: Check[] = [];

	// First statuses
	pr.head?.statuses?.forEach(s => {
		allChecks.push({
			name: s.context,
			description: s.description,
			url: s.targetUrl,
			state: s.state,
			detailsUrl: undefined,
		});
	});
	// Second checks
	pr.head?.checkSuites?.forEach(c => {
		const app = c.appSlug;
		c.checkRuns?.forEach(r => {
			let state;
			switch (r.status) {
				case CheckRunStatus.InProgress:
				case CheckRunStatus.Queued:
					state = StatusState.Pending;
					break;
				case CheckRunStatus.Completed:
					switch (r.conclusion) {
						case CheckRunConclusion.Success:
						case CheckRunConclusion.Neutral:
						case CheckRunConclusion.Skipped:
							state = StatusState.Success;
							break;
						case undefined:
						case null:
							state = StatusState.Success;
							break;
						default:
							state = StatusState.Failure;
							break;
					}
					break;
			}
			allChecks.push({
				name: `${app}/${r.name}`,
				description: r.outputTitle,
				url: r.htmlUrl,
				state,
				detailsUrl: r.detailsUrl,
			});
		});
	});
	return allChecks;
}

interface AutoMergeRule {
	name: string;
	check: (pr: PullRequest, api: Octokit) => Promise<boolean>;
}

const BranchProtectionAutoMergeRule: AutoMergeRule = {
	name: "branch protection rule",
	check: async (pr, api) => {
		const bprAutoMergeRequested = isPrTagged(
			pr,
			AutoMergeBprSuccessLabel,
			AutoMergeBprSuccessTag,
		);
		let bpr: RestEndpointMethodTypes["repos"]["getBranchProtection"]["response"];
		try {
			bpr = await api.repos.getBranchProtection({
				owner: pr.repo.owner,
				repo: pr.repo.name,
				branch: pr.baseBranchName,
			});
			(pr as any).protectionRule = bpr;
		} catch (e) {
			return !bprAutoMergeRequested;
		}

		if (bpr) {
			return await retry(
				async () => {
					const gpr = (
						await api.pulls.get({
							owner: pr.repo.owner,
							repo: pr.repo.name,
							pull_number: pr.number,
						})
					).data;

					log.info(
						`GitHub indicates that pull request is mergeable: ${gpr.mergeable_state}`,
					);

					if (gpr.mergeable_state === "unknown") {
						throw new Error(
							"GitHub PR mergeable_state not available. Retrying...",
						);
					} else if (
						[
							"clean",
							"unstable",
							"has_hooks" /* GHE only */,
						].includes(gpr.mergeable_state)
					) {
						return true;
					}
					return false;
				},
				{
					retries: 5,
					factor: 3,
					minTimeout: 1 * 500,
					maxTimeout: 5 * 1000,
					randomize: true,
				},
			);
		}
		return !bprAutoMergeRequested;
	},
};

const ReviewApproveAutoMergeRule: AutoMergeRule = {
	name: "approved reviews",
	check: async (pr, api) => {
		if (!pr.reviews || pr.reviews.length === 0) {
			return false;
		} else if (pr.reviews.some(r => r.state !== "approved")) {
			return false;
		}
		return true;
	},
};

const CheckAutoMergeRule: AutoMergeRule = {
	name: "checks and statuses",
	check: async (pr, api) => {
		const checks = aggregateChecksAndStatus(pr);
		if (checks?.length === 0) {
			return isPrTagged(pr, AutoMergeLabel, AutoMergeTag);
		} else if (checks?.some(s => s.state !== StatusState.Success)) {
			return false;
		}
		return true;
	},
};

function mergeMethod(
	pr: PullRequest,
	configuration: AutoMergeConfiguration,
): "merge" | "rebase" | "squash" {
	const methodLabel = pr.labels.find(l =>
		l.name.startsWith(AutoMergeMethodLabel),
	);
	if (methodLabel && methodLabel.name.includes(":")) {
		const method = methodLabel.name.split(":")[1].toLowerCase() as any;
		if (AutoMergeMethods.includes(method)) {
			return method;
		}
	}
	return configuration?.mergeMethod || "merge";
}

function reviewComment(pr: PullRequest): string {
	const approvedReviews = pr.reviews?.filter(
		p => p.state === ReviewState.Approved,
	);
	if (approvedReviews.length > 0) {
		return `${approvedReviews.length} approved ${
			approvedReviews.length > 1 ? "reviews" : "review"
		} by ${approvedReviews
			.map(r => `${r.by.map(b => `@${b.login}`).join(", ")}`)
			.join(", ")}`;
	} else {
		return "No reviews";
	}
}

function statusComment(pr: PullRequest): string {
	if (pr.head?.statuses?.length > 0 || pr.head?.checkSuites?.length > 0) {
		const checks = aggregateChecksAndStatus(pr).filter(
			c => c.state === StatusState.Success,
		);
		return `${checks.length} successful ${
			checks.length === 1 ? "check" : "checks"
		}`;
	} else {
		return "No checks";
	}
}

function commitDetails(
	method: string,
	pr: PullRequest,
	bpr: any,
): { title: string; message: string } {
	let title;
	let message = "";
	switch (method) {
		case "merge":
			title = `Auto-merge pull request #${pr.number} from ${pr.repo.owner}/${pr.repo.name}`;
			message = pr.title;
			break;
		case "squash":
			title = `${pr.title} (#${pr.number})`;
			message = `${pr.commits.map(c => ` * ${c.message}`).join("\n")}`;
			break;
		case "rebase":
			break;
	}
	message = `${message}
    
Pull request auto merged:

${
	bpr ? `* Protection rule for branch \`${pr.baseBranchName}\` passed\n` : ""
}* ${reviewComment(pr)}
* ${statusComment(pr)}`;
	return { title, message };
}

export async function executeAutoMerge(
	pr: PullRequest,
	ctx: EventContext<any, AutoMergeConfiguration>,
	credential: secret.GitHubAppCredential | secret.GitHubCredential,
): Promise<HandlerStatus> {
	if (!pr) {
		return status
			.success("Pull request missing in incoming event")
			.hidden();
	}

	const slug = `${pr?.repo?.owner}/${pr?.repo?.name}#${pr.number}`;
	const link = `[${slug}](${pr.url})`;

	if (pr.state !== "open") {
		await ctx.audit.log(`Pull request auto-merge ignoring closed ${slug}`);
		return status
			.success(`Pull request auto-merge ignoring closed ${link}`)
			.hidden();
	}

	const cfg = ctx.configuration?.parameters;
	const authors = cfg?.authors || [];
	if (authors.length > 0 && !authors.includes(pr.author.login)) {
		await ctx.audit.log(
			`Pull request ${slug} ignored because not authored by any of the configured users`,
		);
		return status
			.success(
				`Pull request ${slug} ignored because not authored by any of the configured users`,
			)
			.hidden();
	}

	const api = github.api(
		repository.gitHub({
			owner: pr.repo.owner,
			repo: pr.repo.name,
			credential,
		}),
	);

	// We filter the labels to limit executions, we have to get all labels back in
	// Remove once https://github.com/atomisthq/automation-api/issues/930 is fixed
	const ghPr = (
		await api.pulls.get({
			owner: pr.repo.owner,
			repo: pr.repo.name,
			pull_number: pr.number,
		})
	).data;
	pr.labels = ghPr?.labels?.map(l => ({ name: l.name })) || pr.labels;

	if (!isPrAutoMergeEnabled(pr)) {
		await ctx.audit.log(
			`Pull request auto-merge not requested for ${slug}`,
		);
		return status.success(`Pull request ${link} not auto-merged`).hidden();
	}

	await ctx.audit.log(
		`Starting auto-merge processing for pull request ${slug} with labels: ${pr.labels
			.map(l => l.name)
			.join(", ")}`,
	);

	const rules: AutoMergeRule[] = [];
	const failedRules: string[] = [];

	// Always check the branch protection rules
	rules.push(BranchProtectionAutoMergeRule);
	if (isPrTagged(pr, AutoMergeLabel, AutoMergeTag)) {
		rules.push(ReviewApproveAutoMergeRule, CheckAutoMergeRule);
	}
	if (isPrTagged(pr, AutoMergeCheckSuccessLabel, AutoMergeCheckSuccessTag)) {
		rules.push(CheckAutoMergeRule);
	}

	for (const rule of rules) {
		if (!(await rule.check(pr, api))) {
			failedRules.push(rule.name);
		}
	}

	if (failedRules.length > 0) {
		await ctx.audit.log(
			`Pull request auto-merge not enabled for ${slug} because following rules failed: ${failedRules.join(
				", ",
			)}`,
		);
		return status.success(
			`Pull request auto-merge not enabled for ${link}.`,
		);
	}

	await ctx.audit.log(
		`Pull request auto-merge enabled for ${slug}. Attempting to merge...`,
	);

	try {
		const result = await retry(
			async () => {
				const gpr = (
					await api.pulls.get({
						owner: pr.repo.owner,
						repo: pr.repo.name,
						pull_number: pr.number,
					})
				).data;

				log.info(
					`GitHub indicates that pull request is mergeable: ${gpr.mergeable}`,
				);

				if (gpr.mergeable === undefined || gpr.mergeable === null) {
					throw new Error(
						"GitHub PR mergeable state not available. Retrying...",
					);
				}

				if (gpr.mergeable) {
					const method = mergeMethod(
						pr,
						ctx.configuration?.parameters,
					);
					const details = commitDetails(
						method,
						pr,
						(pr as any).protectionRule,
					);

					const body = `${
						(pr as any).protectionRule
							? `* Branch protection rule for branch \`${pr.baseBranchName}\` passed\n`
							: ""
					}* ${reviewComment(pr)}
* ${statusComment(pr)}
${github.formatMarkers(ctx)}`;

					if (!cfg.dryRun) {
						await api.pulls.merge({
							owner: pr.repo.owner,
							repo: pr.repo.name,
							pull_number: pr.number,
							merge_method: method,
							commit_title: details.title,
							commit_message: details.message,
						});
						await ctx.audit.log(`Pull request ${slug} auto-merged`);

						await api.issues.createComment({
							owner: pr.repo.owner,
							repo: pr.repo.name,
							issue_number: pr.number,
							body: `Pull request auto merged:

${body}`,
						});
						await ctx.audit.log(
							`Pull request auto-merge comment created`,
						);
						return status.success(
							`Pull request ${link} auto-merged`,
						);
					} else {
						const comments = (
							await api.issues.listComments({
								owner: pr.repo.owner,
								repo: pr.repo.name,
								issue_number: pr.number,
								per_page: 100,
							})
						).data;

						const comment = (comments || []).find(c =>
							c.body.includes(
								"[atomist-skill:atomist/github-auto-merge-skill]",
							),
						);
						if (comment) {
							await api.issues.updateComment({
								owner: pr.repo.owner,
								repo: pr.repo.name,
								issue_number: pr.number,
								comment_id: comment.id,
								body: `Pull request ready to be auto-merged:
							
${body}

To enable auto-merge on this pull request disable the dry-run mode in the [skill configuration](${ctx.configuration.url}).`,
							});
						} else {
							await api.issues.createComment({
								owner: pr.repo.owner,
								repo: pr.repo.name,
								issue_number: pr.number,
								body: `Pull request ready to be auto-merged:
							
${body}

To enable auto-merge on this pull request disable the dry-run mode in the [skill configuration](${ctx.configuration.url}).`,
							});
						}
						return status.success(
							`Pull request ${link} ready to be auto-merged`,
						);
					}
				} else {
					await ctx.audit.log(
						`Pull request ${slug} not auto-merged because it can't be merged at this time`,
					);
					return status.success(
						`Pull request ${link} not auto-merged because it can't be merged at this time`,
					);
				}
			},
			{
				retries: 5,
				factor: 3,
				minTimeout: 1 * 500,
				maxTimeout: 5 * 1000,
				randomize: true,
			},
		);

		log.debug(
			`Pull request ${slug} auto-merge retry resulted: ${result.reason}`,
		);

		return result;
	} catch (e) {
		await ctx.audit.log(
			`Pull request ${slug} not auto-merged because it can't be merged at this time`,
		);
		return status.success(
			`Pull request ${link} not auto-merged because it can't be merged at this time`,
		);
	}
	return status.success(`Pull request ${link} not auto-merged`).hidden();
}
