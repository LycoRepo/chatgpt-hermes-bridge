# Windows and WSL setup

Hermes stays on Windows. Prerequisites: Git for Windows, Windows Node.js 20+ with npm, and an already configured Windows `hermes.exe`. The background desktop shortcut manages Hermes; it is not the task executable. No model provider credentials are copied or generated.

## Installation

```powershell
npm run setup
npm run connect:codex
npm run doctor
```

Or `powershell -NoProfile -File scripts/bridge.ps1 install`. The installer initializes pinned submodules, checks revisions/clean state, installs main and action lockfiles with implicit install scripts disabled, explicitly builds the action component, enables Git hooks and writes local configuration. It does not install UI/OCR dependencies into Hermes Python, modify Windows services, add startup tasks or start a GUI.

`HERMES_COMMAND` can supply the executable before first setup. Otherwise setup detects the Windows LocalAppData installation. Existing local JSON is validated and preserved. `npm run configure` regenerates snippets without rebuilding. Configuration rejects unknown keys, non-loopback hosts, weakened recursion/serialization policy, payload logging and unsupported state directories. `.env` is not loaded automatically.

## Existing Codex and VS Code

`connect:codex` adds `hermes_bridge` to Windows Codex configuration, preserves other settings and saves an ignored `.local/backups` copy. It refuses a same-name server with different command/arguments. The entry uses absolute paths, a planning-tool allowlist and a timeout aligned with task deadlines. It embeds no tokens. Codex must be on PATH.

The [official MCP documentation](https://learn.chatgpt.com/docs/extend/mcp?surface=cli) describes shared configuration across the desktop app, CLI and IDE extension. Reload the app/extension when convenient to discover newly registered tools. Scripts never reload or focus windows. Actual tool visibility in a specific conversation remains a separate check.

Setup creates `.vscode/mcp.json` for VS Code's own MCP client. Existing files are preserved; the generated alternative stays in `.local/clients/vscode-mcp.json`. That client and the Codex extension are distinct clients. Repository tasks offer install/start/stop/doctor/test.

## WSL2

```bash
bash scripts/bridge-wsl.sh doctor
python3 scripts/connect-wsl.py
```

The wrapper calls Windows PowerShell/npm. Registration reads the generated WSL snippet, backs up WSL Codex config, verifies TOML and preserves all other settings. It launches `/mnt/<drive>/.../node.exe` with a Windows script argument, using the same Windows Hermes and state store. Python 3.11+ and WSL interoperability are required. No WSL Node or WSL Hermes is installed.

If WSL config resolves to Windows-mounted config, registration refuses to overwrite it with Linux paths. The existing WSL VS Code extension binary can verify registration even when Codex is absent from login-shell PATH. Runtime permission to reach Windows executables still follows client policies; registration does not bypass them.

## Background service

```powershell
npm start
npm run doctor
npm run probe:http
npm stop
```

The optional HTTP service binds only to `127.0.0.1`, exposes the forward role and checks bearer authentication, Host, peer address and Origin. There is no browser CORS or remote exposure. A generated token/instance identity live in ignored `.local/service.json`, never printed. Health/stop authenticate that instance. Stop refuses active requests/tasks and never kills a PID or application by name. Repeated start/stop are safe. Stdio registration does not need the HTTP service.

Failed startup preserves identity metadata. Doctor reports unhealthy state and locks; it does not steal locks or force termination. Inspect failed startup/owner state before manually recovering stale metadata. Use a private local workspace; POSIX file modes do not guarantee private Windows ACLs.

Doctor checks Windows/Node, configuration, components, build/dependencies, Hermes version, managed service and task-store format. It reports dedicated-session integration as pending. Infrastructure success is not full bidirectional readiness.

`probe:connection` and `probe:http` exercise real stdio/HTTP planning with a fixed reply marker and the existing provider. They print metadata only, retain task payloads in ignored state and perform no Computer Use.

## Remaining acceptance

Real dedicated escalation conversation binding, native Hermes continuation and current-app wakeup still need implementation/verification. The fork UI driver remains disabled. Cloud ChatGPT needs separately verified supported connectivity; localhost is not automatically accessible from cloud sessions. See [dependency status](dependencies.md) for audit findings and limits.
