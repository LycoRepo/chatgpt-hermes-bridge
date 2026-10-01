# Third-party notices

The root MIT license applies to this project's original integration code and documentation. Each third-party component retains its own license, copyright and history. Git submodules do not remove redistribution obligations; retain the upstream license files when distributing initialized components or archives.

| Component | Upstream | License | Copyright notice in pinned version |
|---|---|---|---|
| hermes-action-bridge | https://github.com/TheBlueHouse75/hermes-action-bridge | MIT | Copyright (c) 2026 Cyril Guilleminot |
| chatgpt-escalation-mcp | https://github.com/Dazlarus/chatgpt-escalation-mcp | MIT | Copyright (c) 2024 |
| @modelcontextprotocol/sdk | https://github.com/modelcontextprotocol/typescript-sdk | MIT | Copyright (c) 2024 Anthropic, PBC |

Pinned revisions are recorded in `components.lock.json` and Git gitlinks. License texts remain at `components/hermes-action-bridge/LICENSE` and `components/chatgpt-escalation-mcp/LICENSE` after submodule initialization. The escalation component now uses [LycoRepo's fork](https://github.com/LycoRepo/chatgpt-escalation-mcp) with original upstream history and MIT notice retained. Modifications concern executable identity, restart/window selection, driver resolution, local configuration and regression tests; see [upstream draft PR #1](https://github.com/Dazlarus/chatgpt-escalation-mcp/pull/1). Its original upstream baseline remains recorded in the lock file.

Hermes Agent is an externally installed prerequisite, not vendored in this repository. The user's existing installation remains responsible for its own license files and dependencies. `sc28249782/hermes-mcp-bridge` (Apache-2.0) was evaluated but is not included.

Component npm dependencies have separate licenses. Consult their locked dependency trees before creating a bundled binary or redistributing dependencies. This file is a component attribution record, not a complete bundled dependency license inventory.

The main integration now installs MCP SDK separately through `package-lock.json`, with patched transitive dependencies recorded in [dependencies.md](docs/dependencies.md). The installed SDK license remains at `node_modules/@modelcontextprotocol/sdk/LICENSE`; preserve dependency license texts when bundling or redistributing.
