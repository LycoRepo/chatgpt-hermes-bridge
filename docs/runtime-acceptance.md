# Module 6 local runtime acceptance

Verified on Windows with the existing Windows Hermes and Ubuntu-24.04 WSL2, 2026-10-02. Implementation commit: `b54250566d7106a8611f7a4c47cab6c5155aba53`.

| Check | Result |
|---|---|
| Main repository tests | 24 passed |
| First setup | Fixed submodules, main/action locked dependencies, explicit build, local config and client snippets succeeded |
| Existing config | Repeat setup preserves user settings and existing VS Code MCP file |
| Background lifecycle | Start, repeated start, doctor, stop and repeated stop succeeded |
| Authentication / origin limits | Missing token, browser Origin, forged Host, malformed/oversized request denied |
| Active task stop | Refused until task completed |
| Windows stdio MCP → Windows Hermes | Fixed reply marker received |
| Authenticated HTTP MCP → Windows Hermes | Fixed reply marker received |
| Windows Codex registration | CLI get verified command/arguments and tool timeout; original config backed up |
| WSL Codex registration | Independent WSL config preserved; existing VS Code extension CLI verified entry |
| WSL → Windows Node → Windows Hermes | Fixed reply marker received |
| Main runtime dependency audit | Zero findings at this checkpoint; original action dependency caveat remains |
| Clean clone | Independent clone of committed source initialized public submodules; first setup, all tests, doctor, start, HTTP real call and stop succeeded; Git worktree remained clean |

The clean clone did not register global clients, inherit local config, copy node_modules/dist or require uncommitted source. Its only external runtime prerequisite was the already installed/configured Windows Hermes. Scratch clones and machine-specific config remain outside versioned deliverables.

All probes used the existing inference provider, requested only a fixed reply and printed metadata. No GUI interaction, application restart or dedicated-conversation message was performed. Test HTTP services are stopped. The actual currently open desktop/IDE session was not reloaded, so its tool discovery remains unverified.

This accepts the forward local runtime and tooling, not the whole bidirectional product. Real escalation session binding/identity, native Hermes asynchronous continuation, current-app consumer/wakeup and complete return flow remain pending. The UI driver stays disabled. See [setup](setup-windows.md), [coordinator](coordinator.md) and [dependency caveats](dependencies.md).
