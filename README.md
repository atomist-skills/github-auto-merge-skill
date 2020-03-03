# `atomist/github-auto-merge-skill`

Automatically merge pull requests that pass all checks required to merge.

## Overview

<!---atomist-skill-readme:start--->

When a new pull request is created, this skill will automatically apply the default auto-merge policy and method labels, if set. The labels can be changed on the pull request to modify the policy or merge method for auto-merge.

Once the requirements for auto-merging have been met, the pull request will be merged with the merge method defined for the pull request.

### **Enabling auto-merge**

To enable auto-merging, one of the auto-merge policy labels must be added to the pull request. Set the default auto-merge policy and method in order for this skill to automatically apply the labels to new pull requests raised.

**Auto-merge policy labels:**

- `auto-merge:on-approve`
- `auto-merge:on-check-success`

**Auto-merge method labels:**

- `auto-merge-method:merge`
- `auto-merge-method:rebase`
- `auto-merge-method:squash`

The labels are automatically added to and removed from the repository depending on its settings. For example, disabling the *rebase* merge method in the repository settings on GitHub will automatically remove the label.

## Configuration

### Default auto-merge policy

To set the default policy to use when auto-merging pull requests when no explicit auto-merge label is applied to the pull request, select one of the options.

- **On successful reviews and status checks** — Triggers auto-merge if all requested reviews are approved and all commit status checks are green.
- **On successful status checks** — Triggers auto-merge if all status checks are green.

> Note: there must be at least one [commit status check](https://developer.github.com/v3/repos/statuses/) in order for the auto-merge policy to be met. This skill support [commit status checks](https://developer.github.com/v3/repos/statuses/); it does *not* currently support the [GitHub Checks API](https://developer.github.com/v3/checks/), so if your CI or build tool uses the Checks API, you will need to explicitly add a commit status update to your CI or build step in order for auto-merge to work.

### Default auto-merge method

To specify the default merge method, select one of the these labels:

- **Merge commit**
- **Squash and merge**
- **Rebase and merge**

### Which repositories

By default, this skill will be enabled for all repositories in all organizations you have connected.
To restrict the organizations or specific repositories on which the skill will run, you can explicitly
choose organization(s) and repositories.

## Integrations

**GitHub**

The Atomist GitHub integration must be configured to used this skill. At least one repository must be selected.

**Slack**

If the Atomist Slack integration is configured, this skill will send a notification message to the configured Slack channel when a pull request is created, updated and auto-merged.

## Related skills

This skill works well with the **GitHub Notifications** and **Auto-rebase pull request** skills.

<!---atomist-skill-readme:end--->

---

Created by [Atomist][atomist].
Need Help?  [Join our Slack workspace][slack].

[atomist]: https://atomist.com/ (Atomist - How Teams Deliver Software)
[slack]: https://join.atomist.com/ (Atomist Community Slack) 
