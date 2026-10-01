# Git workflow

`main` is the baseline branch. Use short-lived `feat/<topic>`, `fix/<topic>` or `docs/<topic>` branches. Keep functional changes and dependency updates reviewable. A separate permanent develop branch is unnecessary for the initial project.

Before committing, inspect staged names and run `npm run check:staged`. Before pushing, run `npm run check:secrets` and `npm run check:components`. Local hooks require `npm run setup:git` in each clone. The pre-push hook scans all reachable local history, including credentials removed in later commits. Scanning is heuristic and does not prove arbitrary credentials are absent; inspect the staged diff as well.

Commit submodule gitlinks, `.gitmodules` and `components.lock.json` together. A normal clone does not contain third-party source until submodules are initialized. Avoid `git submodule update --remote` during routine setup because it changes the checked revision.

## Remote configuration

The authenticated GitHub account was verified as `LycoRepo`. The repository `LycoRepo/chatgpt-hermes-bridge` is public (since 2026-10-02), and `origin` is `https://github.com/LycoRepo/chatgpt-hermes-bridge.git`. `main` is the published baseline. GitHub authentication is stored in the system credential manager, not in project files.

This local checkout uses a repository-scoped GitHub CLI credential helper. The portable CLI must remain available at its configured local path. Other clones configure their own credential helper; those machine-specific settings are not versioned. Never embed a token in a remote URL.

If GitHub CLI is used, inspect account status without printing tokens. Credentials remain in the existing credential manager or authorized SSH setup. Do not copy keys into this repository.

Branch protection can be configured after remote creation if supported by the selected GitHub account and repository plan. Required checks should correspond to checks actually present in CI.
