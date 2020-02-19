# `atomist/github-auto-merge-skill`

Automatically merge pull requests that pass all checks required to merge.

## Overview

<!---atomist-skill-readme:start--->

Automatically merge pull requests on GitHub based on assigned labels. Required reviews 
and checks settings configured in the repository on GitHub are used as the rules for auto 
merging. 

This approach makes is easy for pull request authors, or anyone with permissions in the 
repository, to flag a pull request for auto-merge simply by adding a label. The merge 
option can also be set with a label on the pull request.

## Configuration

### Enable Auto-Merge

To enable auto-merging, one the following labels needs to be assigned to the pull request:

 * `auto-merge:on-approve` triggers auto-merge if all requested reviews are approved and all status checks are green
 * `auto-merge:on-check-success` triggers auto-merge if all status checks are green 

### Default Auto-merge Policy

To set the default policy to use when auto-merging pull requests when no explicit auto-merge label is applied to the 
pull request, select one of the options.

### Default Auto-merge Method

To specify the desired merge method, one of the following optional labels can be used:

 * `auto-merge-method:merge`
 * `auto-merge-method:rebase`
 * `auto-merge-method:squash`

### Repositories

By default, this skill will be enabled for all repositories in all organizations you have connected. 
To restrict the organizations or specific repositories on which the skill will run, you can explicitly 
choose organization(s) and repositories.

### Label Management

The labels are automatically added to and removed from the repository depending on its settings.
For example, disabling the _rebase_ merge method in the repository settings will automatically remove the label.

<!---atomist-skill-readme:end--->

---

Created by [Atomist][atomist].
Need Help?  [Join our Slack workspace][slack].

[atomist]: https://atomist.com/ (Atomist - How Teams Deliver Software)
[slack]: https://join.atomist.com/ (Atomist Community Slack) 
