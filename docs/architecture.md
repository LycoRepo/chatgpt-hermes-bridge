# Architecture and implementation boundary

Windows is the runtime host for the installed Hermes Agent. WSL2 is a Codex development surface; it does not host this user's Hermes.

```text
ChatGPT MCP connection / Codex client
                  |
          Project coordinator (planned)
          task ID, locks, hop limits, timeouts, logs
                  |
          hermes-action-bridge
                  |
          Windows Hermes CLI
                  |
          guarded escalation adapter (planned, disabled)
                  |
          chatgpt-escalation-mcp
                  |
          verified ChatGPT application + dedicated conversation
```

The coordinator must enforce origin and hop restrictions at the actual tool boundary. Prompt instructions alone are insufficient. ChatGPT-origin tasks cannot escalate back to ChatGPT by default. One lock per task prevents duplicate active executions; one shared escalation lock serializes UI requests across processes. Persist only task metadata by default.

The upstream escalation driver's process-name matching is incompatible with the installed Codex application's same-named executable. Before enabling it, identify the intended executable path/application package and check all startup, shutdown and window selection paths. Prefer a fork with a reviewed upstream diff; do not silently modify the vendored checkout.

The coordinator, lifecycle scripts, configuration schema validation and end-to-end integration are not implemented at the repository checkpoint. Values in configuration examples describe the intended contract and are not active protections yet.

Ordinary ChatGPT chat requires a supported MCP connection; local Codex stdio registration is a distinct integration. Verify account access and the current application's connection mechanism during implementation. See [official connection documentation](https://developers.openai.com/plugins/deploy/connect-chatgpt).
