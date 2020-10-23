Never wait on someone to merge a pull requests again! With this skill you can
automatically merge pull requests on GitHub based on assigned labels. Required
reviews and checks settings configured in the repository on GitHub are used as
the rules for auto-merging.

This approach makes it easy for pull request authors (or anyone with permissions
in the repository) to flag a pull request for auto-merge, as well as set the
merge option, simply by adding a label. The merge option can also be set with a
label on the pull request.

When a new pull request is created, this skill will automatically apply the
default auto-merge policy and method labels (if set). The labels can be changed
on the pull request to modify the policy or merge method for auto-merge.

Opting out of auto-merge is a simple matter of removing the auto-merge labels
from a pull request.

Once the requirements for auto-merging have been met, the pull request will be
merged with the merge method defined for the pull request.

### Auto-merge behavior is managed using easily visible labels

For every new pull request raised, this skill automatically applies the relevant
labels to control the merge policy and merge method.

-   _Auto-merge policy labels_

    -   <span style="border-radius:24px;background-color:rgb(39,125,125);box-shadow:none;box-sizing:border-box;color:rgb(255,255,255);display:inline-block;font-size:12px;font-weight:500;line-height:18px;margin-bottom:2px;margin-left:0px;margin-right:2px;margin-top:2px;overflow-wrap:break-word;padding-bottom:0px;padding-left:7px;padding-right:7px;padding-top:0px;">auto-merge:on-approve</span>
    -   <span style="border-radius:24px;background-color:rgb(39,125,125);box-shadow:none;box-sizing:border-box;color:rgb(255,255,255);display:inline-block;font-size:12px;font-weight:500;line-height:18px;margin-bottom:2px;margin-left:0px;margin-right:2px;margin-top:2px;overflow-wrap:break-word;padding-bottom:0px;padding-left:7px;padding-right:7px;padding-top:0px;">auto-merge:on-check-success</span>
    -   <span style="border-radius:24px;background-color:rgb(39,125,125);box-shadow:none;box-sizing:border-box;color:rgb(255,255,255);display:inline-block;font-size:12px;font-weight:500;line-height:18px;margin-bottom:2px;margin-left:0px;margin-right:2px;margin-top:2px;overflow-wrap:break-word;padding-bottom:0px;padding-left:7px;padding-right:7px;padding-top:0px;">auto-merge:on-bpr-success</span>

-   _Auto-merge method labels_

    -   <span style="border-radius:24px;background-color:rgb(28,51,75);box-shadow:none;box-sizing:border-box;color:rgb(255,255,255);display:inline-block;font-size:12px;font-weight:500;line-height:18px;margin-bottom:2px;margin-left:0px;margin-right:2px;margin-top:2px;overflow-wrap:break-word;padding-bottom:0px;padding-left:7px;padding-right:7px;padding-top:0px;">auto-merge-method:merge</span>
    -   <span style="border-radius:24px;background-color:rgb(28,51,75);box-shadow:none;box-sizing:border-box;color:rgb(255,255,255);display:inline-block;font-size:12px;font-weight:500;line-height:18px;margin-bottom:2px;margin-left:0px;margin-right:2px;margin-top:2px;overflow-wrap:break-word;padding-bottom:0px;padding-left:7px;padding-right:7px;padding-top:0px;">auto-merge-method:rebase</span>
    -   <span style="border-radius:24px;background-color:rgb(28,51,75);box-shadow:none;box-sizing:border-box;color:rgb(255,255,255);display:inline-block;font-size:12px;font-weight:500;line-height:18px;margin-bottom:2px;margin-left:0px;margin-right:2px;margin-top:2px;overflow-wrap:break-word;padding-bottom:0px;padding-left:7px;padding-right:7px;padding-top:0px;">auto-merge-method:squash</span>

![Pull request labels](docs/images/pr-labels.png)

### Auto-merging after policy is satisfied

![Auto-merge](docs/images/auto-merge.png)
