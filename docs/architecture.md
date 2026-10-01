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

The upstream escalation driver's process-name matching is unsafe with the installed unified application's same-named executable. The pinned fork now selects by executable path, defaults to no restart, never restarts the unified app and checks primary/fallback/cached windows. The user selected the current unified ChatGPT/Codex application as the target. Full navigation/input/response compatibility is still unverified; no unattended UI execution is enabled. See upstream draft PR #1.

The coordinator, lifecycle scripts, configuration schema validation and end-to-end integration are not implemented at the repository checkpoint. Values in configuration examples describe the intended contract and are not active protections yet.

The main-repository target preflight is deliberately conservative and rejects the unvalidated unified UI driver. Its unit tests and the fork's identity tests do not constitute live UI acceptance. At the user's request, no Computer Use or GUI operation was performed during fork validation.

Ordinary ChatGPT chat requires a supported MCP connection; local Codex stdio registration is a distinct integration. Verify account access and the current application's connection mechanism during implementation. See [official connection documentation](https://developers.openai.com/plugins/deploy/connect-chatgpt).
