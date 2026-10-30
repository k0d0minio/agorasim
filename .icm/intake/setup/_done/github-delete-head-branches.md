> Done: Jamie, 2026-10-30. Checked via the GitHub API: `delete_branch_on_merge` is `true`.
> The Neon project `uat-agorasim` holds only `main` and one live preview branch — no branch
> of a closed pull request.

# Setup: GitHub deletes the head branch after a merge

- setup-slug: github-delete-head-branches
- needs: database neon
- where: GitHub → the repository → Settings → General → Pull Requests

## Why

The integration deletes a preview's Neon branch when its git branch is deleted. A head branch
that stays after the merge keeps its Neon branch, and the project fills up with branches.

## Steps

1. Open Settings → General.
2. Under Pull Requests, turn on "Automatically delete head branches".

## Done when

- [x] After a merge, the head branch is gone from GitHub.
- [x] Its Neon branch `preview/<git branch>` is gone from the Neon project.
