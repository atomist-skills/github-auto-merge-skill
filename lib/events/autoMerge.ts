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

import {
    EventContext,
    HandlerStatus,
} from "@atomist/skill/lib/handler";
import { gitHubComRepository } from "@atomist/skill/lib/project";
import { gitHub } from "@atomist/skill/lib/project/github";
import {
    GitHubAppCredential,
    GitHubCredential,
} from "@atomist/skill/lib/secrets";
import promiseRetry = require("promise-retry");
import {
    CheckRunConclusion,
    CheckRunStatus,
    PullRequest,
    StatusState,
} from "../typings/types";

export const AutoMergeLabel = "auto-merge:on-approve";
export const AutoMergeCheckSuccessLabel = "auto-merge:on-check-success";
export const AutoMergeTag = `[${AutoMergeLabel}]`;
export const AutoMergeCheckSuccessTag = `[${AutoMergeCheckSuccessLabel}]`;

export const AutoMergeMethodLabel = "auto-merge-method:";
export const AutoMergeMethods: Array<AutoMergeConfiguration["mergeMethod"]> = ["merge", "rebase", "squash"];

export interface AutoMergeConfiguration {
    mergeOn?: "on-approve" | "on-check-success";
    mergeMethod?: "merge" | "rebase" | "squash";
}

// tslint:disable-next-line:cyclomatic-complexity
export async function executeAutoMerge(pr: PullRequest,
                                       ctx: EventContext<any, AutoMergeConfiguration>,
                                       credential: GitHubAppCredential | GitHubCredential): Promise<HandlerStatus> {
    if (!pr) {
        return {
            visibility: "hidden",
            code: 0,
            reason: "Pull request missing in incoming event",
        };
    }

    const slug = `${pr?.repo?.owner}/${pr?.repo?.name}#${pr.number}`;
    const link = `[${slug}](${pr.url})`;

    if (!isPrAutoMergeEnabled(pr)) {
        await ctx.audit.log(`Pull request auto-merge not requested for ${slug}`);
        return {
            visibility: "hidden",
            code: 0,
            reason: `Pull request ${link} not auto-merged`,
        };
    }

    const autoMergeOnApprove = isPrTagged(pr, AutoMergeLabel, AutoMergeTag);

    await ctx.audit.log(`Starting auto-merge processing for pull request ${slug} with labels: ${pr.labels.map(l => l.name).join(", ")}`);

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
        if (checks?.length === 0 || checks?.some(s => s.state !== StatusState.Success)) {
            await ctx.audit.log(`Pull request ${slug} not auto-merged because of unsuccessful or pending status checks`);
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
        const api = gitHub(gitHubComRepository({ owner: pr.repo.owner, repo: pr.repo.name, credential }));

        return promiseRetry(async retry => {
                let gpr;
                try {
                    gpr = await api.pulls.get({
                        owner: pr.repo.owner,
                        repo: pr.repo.name,
                        pull_number: pr.number, // eslint-disable-line @typescript-eslint/camelcase
                    });
                } catch (e) {
                    retry(e);
                }

                if (gpr.data.mergeable === undefined || gpr.data.mergeable === null) {
                    retry(new Error("GitHub PR mergeable state not available. Retrying..."));
                }

                if (gpr.data.mergeable) {
                    await api.pulls.merge({
                        owner: pr.repo.owner,
                        repo: pr.repo.name,
                        pull_number: pr.number, // eslint-disable-line @typescript-eslint/camelcase
                        merge_method: mergeMethod(pr, ctx.configuration[0]?.parameters), // eslint-disable-line @typescript-eslint/camelcase
                        sha: pr.head.sha,
                        commit_title: `Auto merge pull request #${pr.number} from ${pr.repo.owner}/${pr.repo.name}`, // eslint-disable-line @typescript-eslint/camelcase
                    });
                    await ctx.audit.log(`Pull request ${slug} auto-merged`);
                    const body = `Pull request auto merged by Atomist.

* ${reviewComment(pr)}
* ${statusComment(pr)}`;

                    await api.issues.createComment({
                        owner: pr.repo.owner,
                        repo: pr.repo.name,
                        issue_number: pr.number, // eslint-disable-line @typescript-eslint/camelcase
                        body,
                    });
                    await ctx.audit.log(`Pull request auto-merge comment created`);

                    return {
                        code: 0,
                        reason: `Pull request ${link} auto-merged`,
                    };
                } else {
                    console.info("GitHub returned PR as not mergeable: '%j'", gpr.data);
                    await ctx.audit.log(`Pull request ${slug} not auto-merged because it can't be merged at this time`);
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
            });
    }
    return {
        visibility: "hidden",
        code: 0,
        reason: `Pull request ${link} not auto-merged`,
    };
}

export function isPrAutoMergeEnabled(pr: PullRequest): boolean {
    return isPrTagged(pr, AutoMergeLabel, AutoMergeTag)
        || isPrTagged(pr, AutoMergeCheckSuccessLabel, AutoMergeCheckSuccessTag);
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

function isPrTagged(pr: PullRequest,
                    label: string = AutoMergeLabel,
                    tag: string = AutoMergeTag): boolean {
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

function isTagged(msg: string, tag: string): boolean {
    return msg && msg.indexOf(tag) >= 0;
}

function reviewComment(pr: PullRequest): string {
    if (pr.reviews && pr.reviews.length > 0) {
        return `${pr.reviews.length} approved ${pr.reviews.length > 1 ? "reviews" : "review"} by ${pr.reviews.map(
            r => `${r.by.map(b => `@${b.login}`).join(", ")}`).join(", ")}`;
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
