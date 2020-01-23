# `@atomist/github-auto-merge-skill`

Automatically merge pull requests that pass all checks required to merge.

## Overview

Automatically merge pull requests on GitHub based on assigned labels. Required reviews 
and checks settings configured in the repository on GitHub are used as the rules for auto 
merging. 

This approach makes is easy for pull request authors, or anyone with permissions in the 
repository, to flag a pull request for auto-merge simply by adding a label. The merge 
option can also be set with a label on the pull request.

## Usage

### Enable Auto-Merge

To enable auto-merging, one the following labels has to be assigned to the pull request:

 * `auto-merge:on-approve` triggers auto-merge if all requested reviews are approved and all status checks are green
 * `auto-merge:on-check-success` triggers auto-merge if all status checks are green 

### Specify Merge Method

To specify the desired merge method, one of the following optional labels can be used:

 * `auto-merge-method:merge`
 * `auto-merge-method:rebase`
 * `auto-merge-method:squash`
 
### Label Management

The labels are automatically added to and removed from the repository depending on its settings.
E.g. disabling the _rebase_ merge method will automatically remove the label.

### Scoping

By default, this skill will be enabled for all repositories in all organizations you have connected. 
To restrict the organizations or specific repositories on which the skill will run, you can explicitly 
choose organization(s) and repositories.

---

Created by [Atomist][atomist].
Need Help?  [Join our Slack workspace][slack].

[atomist]: https://atomist.com/ (Atomist - How Teams Deliver Software)
[slack]: https://join.atomist.com/ (Atomist Community Slack) 
