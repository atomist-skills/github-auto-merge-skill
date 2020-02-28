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

import { EventHandler } from "@atomist/skill/lib/handler";
import { gitHubAppToken } from "@atomist/skill/lib/secrets";
import * as Octokit from "@octokit/rest";
import {
    apiUrl,
    AutoMergeCheckSuccessLabel,
    AutoMergeConfiguration,
    AutoMergeLabel,
    AutoMergeMethodLabel,
    AutoMergeMethods,
    gitHub,
} from "./autoMerge";
import {
    ConvergePullRequestAutoMergeLabelsSubscription,
    PullRequestAction,
} from "./types";

export const handler: EventHandler<ConvergePullRequestAutoMergeLabelsSubscription, AutoMergeConfiguration> = async ctx => {
    const pr = ctx.data.PullRequest[0];

    if (pr.action !== PullRequestAction.Opened) {
        await ctx.audit.log(`Pull request ${pr.repo.owner}/${pr.repo.name}#${pr.number} not opened. Ignoring...`);

        return {
            code: 0,
            reason: `Pull request [${pr.repo.owner}/${pr.repo.name}#${pr.number}](${pr.url}) not opened. Ignoring...`,
        };
    }

    const repo = pr.repo;
    const { owner, name } = repo;
    const credentials = await ctx.credential.resolve(gitHubAppToken({ owner, repo: name }));

    const api = gitHub(credentials.token, apiUrl(repo));
    const repoDetails = (await api.repos.get({ owner, repo: name })).data;

    await ctx.audit.log(`Converging auto-merge labels based on repository's merge configuration`);

    await addLabel(AutoMergeLabel, "277D7D", owner, name, api);
    await addLabel(AutoMergeCheckSuccessLabel, "277D7D", owner, name, api);

    for (const label of AutoMergeMethods) {
        if (mergeMethodSettings(repoDetails)[label]) {
            await ctx.audit.log(`Adding ${AutoMergeMethodLabel}${label} label to repository`);
            await addLabel(`${AutoMergeMethodLabel}${label}`, "1C334B", owner, name, api);
        } else {
            await ctx.audit.log(`Removing ${AutoMergeMethodLabel}${label} label from repository`);
            await removeLabel(`${AutoMergeMethodLabel}${label}`, owner, name, api);
        }
    }

    await ctx.audit.log(`Labelling pull request ${pr.repo.owner}/${pr.repo.name}#${pr.number} with configured auto-merge policy and method`);

    const labels = [];
    if (!pr.labels.some(l => l.name.startsWith("auto-merge:"))) {
        labels.push(`auto-merge:${ctx.configuration?.parameters?.mergeOn || "on-approve"}`);
    }
    if (!pr.labels.some(l => l.name.startsWith("auto-merge-method:"))) {
        const method = ctx.configuration?.parameters?.mergeMethod || "merge";
        if (!mergeMethodSettings(repoDetails)[method]) {
            await ctx.audit.log(`Pull request ${pr.repo.owner}/${pr.repo.name}#${pr.number} can't be labelled with auto-merge labels because configured merge method '${method}' is not available on this repository`);
            return {
                code: 1,
                reason: `Pull request [${pr.repo.owner}/${pr.repo.name}#${pr.number}](${pr.url}) can't be labelled with auto-merge labels`,
            };
        }
        labels.push(`auto-merge-method:${ctx.configuration?.parameters?.mergeMethod || "merge"}`);
    }

    // Add the default labels to the PR
    await api.issues.addLabels({
        issue_number: pr.number,
        owner: repo.owner,
        repo: repo.name,
        labels,
    });

    await ctx.audit.log(`Pull request ${pr.repo.owner}/${pr.repo.name}#${pr.number} labelled with: ${labels.join(", ")}`);

    return {
        code: 0,
        reason: `Pull request [${pr.repo.owner}/${pr.repo.name}#${pr.number}](${pr.url}) labelled with auto-merged labels`,
    };
};

function mergeMethodSettings(repoDetails: Octokit.ReposGetResponse): { squash: boolean, merge: boolean, rebase: boolean } {
    return {
        merge: repoDetails.allow_merge_commit,
        rebase: repoDetails.allow_rebase_merge,
        squash: repoDetails.allow_squash_merge,
    };
}

async function addLabel(name: string,
                        color: string,
                        owner: string,
                        repo: string,
                        api: Octokit): Promise<void> {
    try {
        await api.issues.getLabel({
            name,
            repo,
            owner,
        });
    } catch (err) {
        await api.issues.createLabel({
            owner,
            repo,
            name,
            color,
        });
    }
}

async function removeLabel(name: string,
                           owner: string,
                           repo: string,
                           api: Octokit): Promise<void> {
    try {
        await api.issues.deleteLabel({
            owner,
            repo,
            name,
        });
    } catch (err) {
        // ignore
    }
}
