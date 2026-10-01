# Windows setup

1. Clone recursively and use Node.js 20+ with Git for Windows.
2. Enable repository checks with `npm run setup:git`.
3. Confirm existing Hermes with its installed `hermes.exe --version` command. The desktop background shortcut starts the manager; task delegation uses the executable CLI.
4. Copy `.env.example` to `.env` and `config/bridge.example.json` to `config/bridge.local.json`. Fill the actual Windows CLI path locally. No secrets or machine-specific profiles are needed in versioned templates.
5. Run `npm run check:components` and `npm run check:secrets`.

No installer, start/stop/doctor or automatic user configuration changes are shipped at this checkpoint. Those are a later implementation module. The fork corrects application identity matching, but do not enable its unified-app UI driver until live navigation/input/response compatibility is verified.

Use an isolated Python environment for UI/OCR dependencies. The Windows Hermes installation currently has its own Python runtime; do not install UI dependencies into that runtime by default.

For VS Code Remote WSL, open this Windows repository through its `/mnt/c/...` path when needed. A future WSL-facing adapter will call the same Windows coordinator. No independent Hermes installation is required in WSL.
