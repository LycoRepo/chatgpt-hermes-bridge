# Third-party notices

The root MIT license applies to this project's original integration code and documentation. Each third-party component retains its own license, copyright and history. Git submodules do not remove redistribution obligations; retain the upstream license files when distributing initialized components or archives.

| Component | Upstream | License | Copyright notice in pinned version |
|---|---|---|---|
| hermes-action-bridge | https://github.com/TheBlueHouse75/hermes-action-bridge | MIT | Copyright (c) 2026 Cyril Guilleminot |
| chatgpt-escalation-mcp | https://github.com/Dazlarus/chatgpt-escalation-mcp | MIT | Copyright (c) 2024 |

Pinned revisions are recorded in `components.lock.json` and Git gitlinks. License texts remain at `components/hermes-action-bridge/LICENSE` and `components/chatgpt-escalation-mcp/LICENSE` after submodule initialization. Upstream files are unmodified at this checkpoint.

Hermes Agent is an externally installed prerequisite, not vendored in this repository. The user's existing installation remains responsible for its own license files and dependencies. `sc28249782/hermes-mcp-bridge` (Apache-2.0) was evaluated but is not included.

Component npm dependencies have separate licenses. Consult their locked dependency trees before creating a bundled binary or redistributing dependencies. This file is a component attribution record, not a complete bundled dependency license inventory.
