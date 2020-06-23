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

import { Category, parameter, ParameterType, resourceProvider, skill } from "@atomist/skill";
import { AutoMergeConfiguration } from "./lib/configuration";

export const Skill = skill<AutoMergeConfiguration & { repos: any }>({
    name: "github-auto-merge-skill",
    namespace: "atomist",
    displayName: "Auto-merge Pull Request",
    author: "Atomist",
    categories: [Category.CodeReview, Category.DevEx],
    homepageUrl: "https://github.com/atomist-skills/github-auto-merge-skill",
    repositoryUrl: "https://github.com/atomist-skills/github-auto-merge-skill.git",
    iconUrl: "file://docs/images/icon.svg",
    license: "Apache-2.0",

    runtime: {
        memory: 1024,
        timeout: 540,
    },

    resourceProviders: {
        github: resourceProvider.gitHub({ minRequired: 1 }),
        slack: resourceProvider.chat({ minRequired: 0 }),
    },

    parameters: {
        mergeOn: {
            type: ParameterType.SingleChoice,
            displayName: "Default auto-merge policy",
            description: "Select the default policy to use when auto-merging pull requests",
            options: [
                {
                    text: "On successful reviews and status checks",
                    value: "on-approve",
                },
                {
                    text: "On successful status checks",
                    value: "on-check-success",
                },
            ],
            required: false,
        },
        mergeMethod: {
            type: ParameterType.SingleChoice,
            displayName: "Default auto-merge method",
            description: "Select the default merge method to use when auto-merging pull requests",
            options: [
                {
                    text: "Merge commit",
                    value: "merge",
                },
                {
                    text: "Squash and merge",
                    value: "squash",
                },
                {
                    text: "Rebase and merge",
                    value: "rebase",
                },
            ],
            required: false,
        },
        repos: parameter.repoFilter({ required: false }),
    },

    subscriptions: ["file://graphql/subscription/*.graphql"],
});
