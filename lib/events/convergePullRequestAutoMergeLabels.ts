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

import { EventHandler, github, repository, secret } from "@atomist/skill";
import {
	AutoMergeCheckSuccessLabel,
	AutoMergeLabel,
	AutoMergeMethodLabel,
	AutoMergeMethodLabels,
	AutoMergeMethods,
} from "../autoMerge";
import { AutoMergeConfiguration } from "../configuration";
import {
	ConvergePullRequestAutoMergeLabelsSubscription,
	PullRequestAction,
} from "../typings/types";

function mergeMethodSettings(
	repoDetails: any,
): { squash: boolean; merge: boolean; rebase: boolean } {
	return {
		merge: repoDetails.allow_merge_commit,
		rebase: repoDetails.allow_rebase_merge,
		squash: repoDetails.allow_squash_merge,
	};
}

export const handler: EventHandler<
	ConvergePullRequestAutoMergeLabelsSubscription,
	AutoMergeConfiguration
> = async ctx => {
	const pr = ctx.data.PullRequest[0];

	if (pr.action !== PullRequestAction.Opened) {
		await ctx.audit.log(
			`Pull request ${pr.repo.owner}/${pr.repo.name}#${pr.number} action not opened. Ignoring...`,
		);

		return {
			visibility: "hidden",
			code: 0,
			reason: `Pull request [${pr.repo.owner}/${pr.repo.name}#${pr.number}](${pr.url}) action not opened. Ignoring...`,
		};
	}

	const repo = pr.repo;
	const { owner, name } = repo;
	const credential = await ctx.credential.resolve(
		secret.gitHubAppToken({ owner, repo: name }),
	);

	const id = repository.gitHub({ owner, repo: name, credential });
	const api = github.api(id);
	const repoDetails = (await api.repos.get({ owner, repo: name })).data;

	await ctx.audit.log(
		`Converging auto-merge labels based on repository's merge configuration`,
	);

	await github.convergeLabel(
		id,
		AutoMergeLabel,
		"277D7D",
		"Auto-merge on review approvals",
	);
	await github.convergeLabel(
		id,
		AutoMergeCheckSuccessLabel,
		"277D7D",
		"Auto-merge on successful checks",
	);

	for (const label of AutoMergeMethods) {
		if (mergeMethodSettings(repoDetails)[label]) {
			await ctx.audit.log(
				`Adding ${AutoMergeMethodLabel}${label} label to repository`,
			);
			await github.convergeLabel(
				id,
				`${AutoMergeMethodLabel}${label}`,
				"1C334B",
				AutoMergeMethodLabels[label],
			);
		} else {
			await ctx.audit.log(
				`Removing ${AutoMergeMethodLabel}${label} label from repository`,
			);
			await api.issues.deleteLabel({
				owner: id.owner,
				repo: id.repo,
				name: `${AutoMergeMethodLabel}${label}`,
			});
		}
	}

	await ctx.audit.log(
		`Labelling pull request ${pr.repo.owner}/${pr.repo.name}#${pr.number} with configured auto-merge policy and method`,
	);

	const labels = [];
	if (!pr.labels.some(l => l.name.startsWith("auto-merge:"))) {
		labels.push(
			`auto-merge:${
				ctx.configuration[0]?.parameters?.mergeOn || "on-approve"
			}`,
		);
	}
	if (!pr.labels.some(l => l.name.startsWith("auto-merge-method:"))) {
		const method = ctx.configuration[0]?.parameters?.mergeMethod || "merge";
		if (!mergeMethodSettings(repoDetails)[method]) {
			await ctx.audit.log(
				`Pull request ${pr.repo.owner}/${pr.repo.name}#${pr.number} can't be labelled with auto-merge labels because configured merge method '${method}' is not available on this repository`,
			);
			return {
				code: 1,
				reason: `Pull request [${pr.repo.owner}/${pr.repo.name}#${pr.number}](${pr.url}) can't be labelled with auto-merge labels`,
			};
		}
		labels.push(
			`auto-merge-method:${
				ctx.configuration[0]?.parameters?.mergeMethod || "merge"
			}`,
		);
	}

	if (labels.length > 0) {
		// Add the default labels to the PR
		await api.issues.addLabels({
			issue_number: pr.number,
			owner: repo.owner,
			repo: repo.name,
			labels,
		});

		await ctx.audit.log(
			`Pull request ${pr.repo.owner}/${pr.repo.name}#${
				pr.number
			} labelled with: ${labels.join(", ")}`,
		);

		return {
			code: 0,
			reason: `Pull request [${pr.repo.owner}/${pr.repo.name}#${pr.number}](${pr.url}) labelled with auto-merged labels`,
		};
	} else {
		await ctx.audit.log(
			`Pull request ${pr.repo.owner}/${pr.repo.name}#${
				pr.number
			} labelled with: ${labels.join(", ")}`,
		);

		return {
			code: 0,
			visibility: "hidden",
			reason: `Pull request [${pr.repo.owner}/${pr.repo.name}#${pr.number}](${pr.url}) not labelled with auto-merged labels because labels already present`,
		};
	}
};
