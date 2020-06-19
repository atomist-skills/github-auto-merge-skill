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

import { EventHandler, secret } from "@atomist/skill";
import { executeAutoMerge } from "../autoMerge";
import { AutoMergeConfiguration } from "../configuration";
import { AutoMergeOnStatusSubscription } from "../typings/types";

export const handler: EventHandler<AutoMergeOnStatusSubscription, AutoMergeConfiguration> = async ctx => {
    const prs = ctx.data.Status[0].commit.pullRequests as any;
    const results = [];
    for (const pr of prs) {
        const { owner, name } = pr.repo;
        const credentials = await ctx.credential.resolve(secret.gitHubAppToken({ owner, repo: name }));
        const result = await executeAutoMerge(pr, ctx, credentials);
        if (result) {
            results.push(result);
        }
    }
    return {
        code: results.filter(r => !!r.code).some(r => r.code !== 0) ? 1 : 0,
        reason: results
            .filter(r => !!r.reason)
            .map(r => r.reason)
            .join("\n"),
    };
};
