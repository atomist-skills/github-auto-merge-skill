import { EventMaker } from "@atomist/sdm-core/lib/machine/yaml/configureYaml";
import { autoMergeOnBuild } from "../auto-merge/autoMergeOnBuild";
import { autoMergeOnPullRequest } from "../auto-merge/autoMergeOnPullRequest";
import { autoMergeOnReview } from "../auto-merge/autoMergeOnReview";
import { autoMergeOnStatus } from "../auto-merge/autoMergeOnStatus";

export const AutoMergeOnBuild: EventMaker = async sdm => autoMergeOnBuild(sdm);
export const AutoMergeOnPullRequest: EventMaker = async sdm => autoMergeOnPullRequest(sdm);
export const AutoMergeOnReview: EventMaker = async sdm => autoMergeOnReview(sdm);
export const AutoMergeOnStatus: EventMaker = async sdm => autoMergeOnStatus(sdm);
