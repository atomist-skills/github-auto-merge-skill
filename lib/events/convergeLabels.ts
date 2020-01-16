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

import { subscription } from "@atomist/automation-client/lib/graph/graphQL";
import { EventFired } from "@atomist/automation-client/lib/HandleEvent";
import { Success } from "@atomist/automation-client/lib/HandlerResult";
import { GitHubRepoRef } from "@atomist/automation-client/lib/operations/common/GitHubRepoRef";
import { TokenCredentials } from "@atomist/automation-client/lib/operations/common/ProjectOperationCredentials";
import { EventMaker } from "@atomist/sdm-core/lib/machine/yaml/configureYaml";
import { resolveCredentialsPromise } from "@atomist/sdm/lib/api-helper/machine/handlerRegistrations";
import * as Octokit from "@octokit/rest";
import {
    apiUrl,
    AutoMergeCheckSuccessLabel,
    AutoMergeLabel,
    AutoMergeMethodLabel,
    AutoMergeMethods,
    gitHub,
} from "../auto-merge/autoMerge";
import { ConvergePullRequestAutoMergeLabelsSubscription } from "../typings/types";

export const ConvergePullRequestAutoMergeLabels: EventMaker<ConvergePullRequestAutoMergeLabelsSubscription> = async sdm => ({
    subscription: subscription("ConvergePullRequestAutoMergeLabels"),
    listener: async (e: EventFired<ConvergePullRequestAutoMergeLabelsSubscription>, ctx) => {
        const repo = e.data.PullRequest[0].repo;
        const { owner, name } = repo;

        const creds = await resolveCredentialsPromise(sdm.configuration.sdm.credentialsResolver.eventHandlerCredentials(ctx, GitHubRepoRef.from({
            owner,
            repo: name,
            rawApiBase: repo.org.provider.apiUrl,
        })));

        const api = gitHub((creds as TokenCredentials).token, apiUrl(repo));

        await addLabel(AutoMergeLabel, "277D7D", owner, name, api);
        await addLabel(AutoMergeCheckSuccessLabel, "277D7D", owner, name, api);

        for (const label of AutoMergeMethods) {
            await addLabel(`${AutoMergeMethodLabel}${label}`, "1C334B", owner, name, api);
        }
        return Success;
    },
});

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
