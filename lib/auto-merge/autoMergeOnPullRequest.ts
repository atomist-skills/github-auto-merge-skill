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

import { subscription } from "@atomist/automation-client/lib/graph/graphQL";
import { GitHubRepoRef } from "@atomist/automation-client/lib/operations/common/GitHubRepoRef";
import { resolveCredentialsPromise } from "@atomist/sdm/lib/api-helper/machine/handlerRegistrations";
import { SoftwareDeliveryMachine } from "@atomist/sdm/lib/api/machine/SoftwareDeliveryMachine";
import { EventHandlerRegistration } from "@atomist/sdm/lib/api/registration/EventHandlerRegistration";
import { AutoMergeOnPullRequest } from "../typings/types";
import { executeAutoMerge } from "./autoMerge";

export function autoMergeOnPullRequest(sdm: SoftwareDeliveryMachine)
    : EventHandlerRegistration<AutoMergeOnPullRequest.Subscription, { token: string }> {
    return {
        name: "AutoMergeOnPullRequest",
        description: "Auto merge reviewed and approved pull requests on PullRequest event",
        subscription: subscription("AutoMergeOnPullRequest"),
        tags: ["github", "pr", "automerge"],
        listener: async (e, ctx) => {
            const pr = e.data.PullRequest[0];
            const creds = await resolveCredentialsPromise(sdm.configuration.sdm.credentialsResolver.eventHandlerCredentials(ctx, GitHubRepoRef.from({
                owner: pr.repo.owner,
                repo: pr.repo.name,
                rawApiBase: pr.repo.org.provider.apiUrl,
            })));
            return executeAutoMerge(pr, creds);
        },
    };
}
