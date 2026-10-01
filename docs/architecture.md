# Architecture and implementation boundary

Windows is the runtime host for the installed Hermes Agent. WSL2 is a Codex development surface; it does not host this user's Hermes.

```text
ChatGPT MCP connection / Codex client
                  |
          Project coordinator + role-scoped local MCP tools
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

The coordinator enforces origin and hop restrictions in its methods and role-scoped tool handlers. ChatGPT-origin tasks cannot escalate back to ChatGPT. An exclusive store lock makes task transitions atomic across processes and prevents duplicate starts. One active escalation claim serializes consumers; an expired claim fails its parent rather than replays the request. Metadata logs exclude payloads and capabilities. The ignored local task store retains prompts, answers and capabilities for delivery/recovery; it is private runtime data, not a metadata log.

The upstream escalation driver's process-name matching is unsafe with the installed unified application's same-named executable. The pinned fork now selects by executable path, defaults to no restart, never restarts the unified app and checks primary/fallback/cached windows. The user selected the current unified ChatGPT/Codex application as the target. Full navigation/input/response compatibility is still unverified; no unattended UI execution is enabled. See upstream draft PR #1.

The coordinator and stdio tools are implemented. Lifecycle scripts, complete configuration schema validation, real dedicated-session binding and end-to-end application acceptance remain pending. Constructor options and the MCP launcher activate the implemented policies; arbitrary example values are not promises of supported behavior. See [coordinator.md](coordinator.md).

The main-repository target preflight is deliberately conservative and rejects the unvalidated unified UI driver. Its unit tests and the fork's identity tests do not constitute live UI acceptance. At the user's request, no Computer Use or GUI operation was performed during fork validation.

Ordinary ChatGPT chat requires a supported MCP connection; local Codex stdio registration is a distinct integration. Verify account access and the current application's connection mechanism during implementation. See [official connection documentation](https://developers.openai.com/plugins/deploy/connect-chatgpt).
