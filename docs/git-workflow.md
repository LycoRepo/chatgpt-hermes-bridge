# Git workflow

`main` is the baseline branch. Use short-lived `feat/<topic>`, `fix/<topic>` or `docs/<topic>` branches. Keep functional changes and dependency updates reviewable. A separate permanent develop branch is unnecessary for the initial project.

Before committing, inspect staged names and run `npm run check:staged`. Before pushing, run `npm run check:secrets` and `npm run check:components`. Local hooks require `npm run setup:git` in each clone. The pre-push hook scans all reachable local history, including credentials removed in later commits. Scanning is heuristic and does not prove arbitrary credentials are absent; inspect the staged diff as well.

Commit submodule gitlinks, `.gitmodules` and `components.lock.json` together. A normal clone does not contain third-party source until submodules are initialized. Avoid `git submodule update --remote` during routine setup because it changes the checked revision.

## Remote configuration (next checkpoint)

The GitHub account, repository ownership, visibility and authentication must be confirmed before remote creation. The original conversation's example `LycoRepo` is not proof of the currently authenticated account. The scaffold has no origin until that check is complete.

After the account and destination are verified, create an empty repository with the selected visibility, add its credential-free HTTPS or SSH URL as `origin`, and push `main`. Do not create a separate remote README that would diverge from the local first commit. Never embed a token in a remote URL.

If GitHub CLI is used, inspect account status without printing tokens. Credentials remain in the existing credential manager or authorized SSH setup. Do not copy keys into this repository.

Branch protection can be configured after remote creation if supported by the selected GitHub account and repository plan. Required checks should correspond to checks actually present in CI.
