/*
 * Copyright © 2021 Atomist, Inc.
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
	Category,
	parameter,
	ParameterType,
	ParameterVisibility,
	resourceProvider,
	skill,
} from "@atomist/skill";

import { AutoMergeConfiguration } from "./lib/configuration";

export const Skill = skill<AutoMergeConfiguration & { repos: any }>({
	name: "github-auto-merge-skill",
	namespace: "atomist",
	description: "Merge pull requests that pass all required checks",
	displayName: "Auto-Merge Pull Requests",
	categories: [Category.RepoManagement],
	iconUrl:
		"https://raw.githubusercontent.com/atomist-skills/github-auto-merge-skill/main/docs/images/icon.svg",

	runtime: {
		memory: 1024,
		timeout: 540,
	},

	resourceProviders: {
		github: resourceProvider.gitHub({ minRequired: 1 }),
	},

	parameters: {
		dryRun: {
			type: ParameterType.Boolean,
			displayName: "Dry run",
			description:
				"Do not actually merge pull requests but leave a comment in the PR indicated when a pull request would get merged",
			defaultValue: true,
			required: true,
		},
		mergeOn: {
			type: ParameterType.SingleChoice,
			displayName: "Default auto-merge policy",
			description:
				"Select the default policy to use when auto-merging pull requests. If no policy is selected the skill will default to auto merge on successful reviews and status checks.",
			options: [
				{
					text: "On successful reviews and status checks",
					value: "on-approve",
				},
				{
					text: "On successful status checks",
					value: "on-check-success",
				},
				{
					text: "On passing branch protection rule",
					value: "on-bpr-success",
				},
			],
			required: false,
		},
		mergeMethod: {
			type: ParameterType.SingleChoice,
			displayName: "Default auto-merge method",
			description:
				"Select the default merge method to use when auto-merging pull requests. If no method is selected this skill will default to auto-merge with a merge commit.",
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
		authors: {
			type: ParameterType.StringArray,
			displayName: "Auto-merge authors",
			description:
				"Auto-merge pull requests that are authored from the following GitHub users or bots only",
			required: false,
		},
		checks: {
			type: ParameterType.StringArray,
			displayName: "Required checks and statuses",
			description:
				"Provide a list of checks that need to be successful in order to auto-merge pull requests",
			required: false,
			visibility: ParameterVisibility.Advanced,
		},
		repos: parameter.repoFilter({ required: false }),
	},
});
