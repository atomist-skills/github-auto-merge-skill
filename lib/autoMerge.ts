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

import { EventContext, github, HandlerStatus, log, repository, secret } from "@atomist/skill";
import * as retry from "p-retry";
import { AutoMergeConfiguration } from "./configuration";
import { CheckRunConclusion, CheckRunStatus, PullRequest, ReviewState, StatusState } from "./typings/types";

export const AutoMergeLabel = "auto-merge:on-approve";
export const AutoMergeCheckSuccessLabel = "auto-merge:on-check-success";
export const AutoMergeTag = `[${AutoMergeLabel}]`;
export const AutoMergeCheckSuccessTag = `[${AutoMergeCheckSuccessLabel}]`;

export const AutoMergeMethodLabel = "auto-merge-method:";
export const AutoMergeMethods: Array<AutoMergeConfiguration["mergeMethod"]> = ["merge", "rebase", "squash"];
export const AutoMergeMethodLabels = {
    merge: "Auto-merge with merge commit",
    rebase: "Auto-merge with rebase and merge",
    squash: "Auto-merge with squash and merge",
};

function isTagged(msg: string, tag: string): boolean {
    return msg && msg.indexOf(tag) >= 0;
}

function isPrTagged(pr: PullRequest, label: string = AutoMergeLabel, tag: string = AutoMergeTag): boolean {
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
        isPrTagged(pr, AutoMergeCheckSuccessLabel, AutoMergeCheckSuccessTag)
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

function mergeMethod(pr: PullRequest, configuration: AutoMergeConfiguration): "merge" | "rebase" | "squash" {
    const methodLabel = pr.labels.find(l => l.name.startsWith(AutoMergeMethodLabel));
    if (methodLabel && methodLabel.name.includes(":")) {
        const method = methodLabel.name.split(":")[1].toLowerCase() as any;
        if (AutoMergeMethods.includes(method)) {
            return method;
        }
    }
    return configuration?.mergeMethod || "merge";
}

function reviewComment(pr: PullRequest): string {
    const approvedReviews = pr.reviews?.filter(p => p.state === ReviewState.Approved);
    if (approvedReviews.length > 0) {
        return `${approvedReviews.length} approved ${
            approvedReviews.length > 1 ? "reviews" : "review"
        } by ${approvedReviews.map(r => `${r.by.map(b => `@${b.login}`).join(", ")}`).join(", ")}`;
    } else {
        return "No reviews";
    }
}

function statusComment(pr: PullRequest): string {
    if (pr.head?.statuses?.length > 0 || pr.head?.checkSuites?.length > 0) {
        const checks = aggregateChecksAndStatus(pr);
        return `${checks.length} successful ${checks.length === 1 ? "check" : "checks"}`;
    } else {
        return "No checks";
    }
}

function commitDetails(method: string, pr: PullRequest): { title: string; message: string } {
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

* ${reviewComment(pr)}
* ${statusComment(pr)}`;
    return { title, message };
}

export async function executeAutoMerge(
    pr: PullRequest,
    ctx: EventContext<any, AutoMergeConfiguration>,
    credential: secret.GitHubAppCredential | secret.GitHubCredential,
): Promise<HandlerStatus> {
    if (!pr) {
        return {
            visibility: "hidden",
            code: 0,
            reason: "Pull request missing in incoming event",
        };
    }

    const slug = `${pr?.repo?.owner}/${pr?.repo?.name}#${pr.number}`;
    const link = `[${slug}](${pr.url})`;

    if (pr.state !== "open") {
        await ctx.audit.log(`Pull request auto-merge ignoring closed ${slug}`);
        return {
            visibility: "hidden",
            code: 0,
            reason: `Pull request auto-merge ignoring closed ${slug}`,
        };
    }

    const api = github.api(repository.gitHub({ owner: pr.repo.owner, repo: pr.repo.name, credential }));

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
        await ctx.audit.log(`Pull request auto-merge not requested for ${slug}`);
        return {
            visibility: "hidden",
            code: 0,
            reason: `Pull request ${link} not auto-merged`,
        };
    }

    const autoMergeOnApprove = isPrTagged(pr, AutoMergeLabel, AutoMergeTag);

    await ctx.audit.log(
        `Starting auto-merge processing for pull request ${slug} with labels: ${pr.labels.map(l => l.name).join(", ")}`,
    );

    // 1. at least one approved review if PR isn't set to merge on successful build
    if (autoMergeOnApprove) {
        if (!pr.reviews || pr.reviews.length === 0) {
            await ctx.audit.log(`Pull request ${slug} not auto-merged because no approved reviews`);
            return {
                code: 0,
                reason: `Pull request ${link} not auto-merged because no approved reviews`,
            };
        } else if (pr.reviews.some(r => r.state !== "approved")) {
            await ctx.audit.log(`Pull request ${slug} not auto-merged because of unapproved reviews`);
            return {
                code: 0,
                reason: `Pull request ${link} not auto-merged because of unapproved reviews`,
            };
        }
    }

    // 2. all status checks are successful and there is at least one check
    if (pr.head?.statuses?.length > 0 || pr.head?.checkSuites?.length > 0) {
        const checks = aggregateChecksAndStatus(pr);
        if (checks?.length === 0) {
            await ctx.audit.log(`Pull request ${slug} not auto-merged because of no successful status checks`);
            return {
                code: 0,
                reason: `Pull request ${link} not auto-merged because of no successful status checks`,
            };
        } else if (checks?.some(s => s.state !== StatusState.Success)) {
            await ctx.audit.log(
                `Pull request ${slug} not auto-merged because of unsuccessful or pending status checks`,
            );
            return {
                code: 0,
                reason: `Pull request ${link} not auto-merged because of unsuccessful or pending status checks`,
            };
        }
    } else if (!autoMergeOnApprove) {
        await ctx.audit.log(`Pull request ${slug} not auto-merged because of no status checks`);
        return {
            code: 0,
            reason: `Pull request ${link} not auto-merged because of no status checks`,
        };
    }

    if (isPrAutoMergeEnabled(pr)) {
        await ctx.audit.log(`Pull request auto-merge enabled for ${slug}. Attempting to merge...`);

        try {
            const result = await retry(
                async () => {
                    const gpr = await api.pulls.get({
                        owner: pr.repo.owner,
                        repo: pr.repo.name,
                        pull_number: pr.number,
                    });

                    log.info(`GitHub indicates that pull request is mergeable: ${gpr.data.mergeable}`);

                    if (gpr.data.mergeable === undefined || gpr.data.mergeable === null) {
                        throw new Error("GitHub PR mergeable state not available. Retrying...");
                    }

                    if (gpr.data.mergeable) {
                        const method = mergeMethod(pr, ctx.configuration[0]?.parameters);
                        const details = commitDetails(method, pr);
                        await api.pulls.merge({
                            owner: pr.repo.owner,
                            repo: pr.repo.name,
                            pull_number: pr.number,
                            merge_method: method,
                            commit_title: details.title,
                            commit_message: details.message,
                        });
                        await ctx.audit.log(`Pull request ${slug} auto-merged`);
                        const body = `Pull request auto merged:

* ${reviewComment(pr)}
* ${statusComment(pr)}
${github.formatMarkers(ctx)}`;

                        await api.issues.createComment({
                            owner: pr.repo.owner,
                            repo: pr.repo.name,
                            issue_number: pr.number,
                            body,
                        });
                        await ctx.audit.log(`Pull request auto-merge comment created`);

                        return {
                            code: 0,
                            reason: `Pull request ${link} auto-merged`,
                        };
                    } else {
                        await ctx.audit.log(
                            `Pull request ${slug} not auto-merged because it can't be merged at this time`,
                        );
                        return {
                            code: 0,
                            reason: `Pull request ${link} not auto-merged because it can't be merged at this time`,
                        };
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

            log.debug(`Pull request ${slug} auto-merge retry resulted: ${result.reason}`);

            return result;
        } catch (e) {
            await ctx.audit.log(`Pull request ${slug} not auto-merged because it can't be merged at this time`);
            return {
                code: 0,
                reason: `Pull request ${link} not auto-merged because it can't be merged at this time`,
            };
        }
    }
    return {
        visibility: "hidden",
        code: 0,
        reason: `Pull request ${link} not auto-merged`,
    };
}
