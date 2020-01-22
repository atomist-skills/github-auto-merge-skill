/*
 * Copyright © 2019 Atomist, Inc.
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
import {
    GitHubAppCredential,
    gitHubAppToken,
} from "@atomist/skill/lib/secrets";
import * as Octokit from "@octokit/rest";
import { ReposGetResponse } from "@octokit/rest";
import {
    apiUrl,
    AutoMergeCheckSuccessLabel,
    AutoMergeLabel,
    AutoMergeMethodLabel,
    AutoMergeMethods,
    gitHub,
} from "./autoMerge";
import { ConvergePullRequestAutoMergeLabelsSubscription } from "./types";

export const handler: EventHandler<ConvergePullRequestAutoMergeLabelsSubscription> = async ctx => {
    const repo = ctx.data.PullRequest[0].repo;
    const { owner, name } = repo;
    const credentials = await ctx.credential.resolve<GitHubAppCredential>(gitHubAppToken({ owner, repo: name }));

    const api = gitHub(credentials.token, apiUrl(repo));
    const repoDetails = (await api.repos.get({ owner, repo: name })).data;

    await addLabel(AutoMergeLabel, "277D7D", owner, name, api);
    await addLabel(AutoMergeCheckSuccessLabel, "277D7D", owner, name, api);

    for (const label of AutoMergeMethods) {
        if (mergeMethodSettings(repoDetails)[label]) {
            await addLabel(`${AutoMergeMethodLabel}${label}`, "1C334B", owner, name, api);
        } else {
            await removeLabel(`${AutoMergeMethodLabel}${label}`, owner, name, api);
        }
    }
};

function mergeMethodSettings(repoDetails: ReposGetResponse): { squash: boolean, merge: boolean, rebase: boolean } {
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
