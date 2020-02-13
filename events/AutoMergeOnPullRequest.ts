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
import {
    AutoMergeConfiguration,
    executeAutoMerge,
} from "./autoMerge";
import { AutoMergeOnPullRequestSubscription } from "./types";

export const handler: EventHandler<AutoMergeOnPullRequestSubscription, AutoMergeConfiguration> = async ctx => {
    const pr = ctx.data.PullRequest[0];
    const { owner, name } = pr.repo;
    const credentials = await ctx.credential.resolve(gitHubAppToken({ owner, repo: name }));
    await executeAutoMerge(pr, ctx.configuration?.parameters, credentials);
};
