# Switching a component to a fork

Use an upstream submodule until source changes are necessary. For the escalation component, a fork may be needed to correct application identity matching.

1. Create a fork in the confirmed GitHub account.
2. Add the upstream remote inside that component and keep its current commit as the baseline.
3. Implement and validate the required fix on a component feature branch. Commit and push the component change to the fork before the parent references it.
4. Change the parent `.gitmodules` URL for that component to the fork's credential-free URL.
5. Run `git submodule sync --recursive` and check out the fork's published commit.
6. Update `components.lock.json` with the new revision and fork URL, retaining an `original_upstream` field. Update attribution and state that source modifications are present.
7. Commit the parent gitlink, lock and URL change together. Test a fresh recursive clone before release.

Keep fixes small and record the upstream base revision, reason, validation and any upstream PR. Retain license notices. Merge or rebase upstream updates on a review branch, test the resulting component, and publish the new fixed revision before changing the parent.
