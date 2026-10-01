"""Register the Windows stdio launcher in WSL Codex without printing user config."""
import json
import os
import re
import shutil
import subprocess
import sys
import tomllib
import uuid
from pathlib import Path

def main():
    if sys.platform != "linux" or "microsoft" not in Path("/proc/sys/kernel/osrelease").read_text().lower():
        raise RuntimeError("run_in_wsl")
    root = Path(__file__).resolve().parent.parent
    snippet = (root / ".local/clients/codex-wsl.toml").read_text()
    requested = tomllib.loads(snippet)["mcp_servers"]["hermes_bridge"]
    config = Path(os.environ.get("CODEX_HOME", str(Path.home() / ".codex"))) / "config.toml"
    if str(config.resolve()).startswith("/mnt/"):
        raise RuntimeError("shared_windows_config_refused")
    before = config.read_text() if config.exists() else ""
    parsed = tomllib.loads(before)
    existing = parsed.get("mcp_servers", {}).get("hermes_bridge")
    if existing and (existing.get("command") != requested["command"] or existing.get("args") != requested["args"]):
        raise RuntimeError("existing_server_conflict")
    if existing:
        pattern = r"(?ms)^\[mcp_servers\.hermes_bridge\]\s*\n.*?(?=^\s*\[\[?[A-Za-z_\"']|\Z)"
        after, count = re.subn(pattern, lambda _: snippet + "\n", before, count=1)
        if count != 1:
            raise RuntimeError("owned_table_not_found")
    else:
        after = before.rstrip() + "\n\n" + snippet
    verified = tomllib.loads(after)
    # Semantic guard: all settings outside this one table must remain identical.
    parsed.get("mcp_servers", {}).pop("hermes_bridge", None)
    verified.get("mcp_servers", {}).pop("hermes_bridge", None)
    if not parsed.get("mcp_servers"):
        parsed.pop("mcp_servers", None)
    if not verified.get("mcp_servers"):
        verified.pop("mcp_servers", None)
    if parsed != verified:
        raise RuntimeError("unrelated_configuration_change")
    config.parent.mkdir(parents=True, exist_ok=True)
    backups = root / ".local/backups"
    backups.mkdir(parents=True, exist_ok=True)
    if config.exists():
        backup = backups / f"codex-wsl-{uuid.uuid4()}.toml"
        shutil.copyfile(config, backup)
        backup.chmod(0o600)
    temporary = config.parent / f"bridge-{uuid.uuid4()}.tmp"
    with temporary.open("x") as output:
        temporary.chmod(0o600)
        output.write(after)
    if config.exists() and config.read_text() != before:
        temporary.unlink()
        raise RuntimeError("concurrent_configuration_change")
    temporary.replace(config)
    candidates = sorted((Path.home() / ".vscode-server/extensions").glob("openai.chatgpt-*/bin/linux-*/codex"))
    cli = shutil.which("codex") or (str(candidates[-1]) if candidates else None)
    cli_verified = False
    if cli:
        result = subprocess.run([cli, "mcp", "get", "hermes_bridge", "--json"], capture_output=True, text=True, timeout=20)
        entry = json.loads(result.stdout) if result.returncode == 0 else {}
        cli_verified = entry.get("transport", {}).get("command") == requested["command"]
        if not cli_verified:
            raise RuntimeError("wsl_cli_verification_failed")
    print(json.dumps({"status": "registered", "server": "hermes_bridge", "windowsHermes": True, "wslCliVerified": cli_verified, "extensionReloadRequired": True}))

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        allowed = {"run_in_wsl", "shared_windows_config_refused", "existing_server_conflict", "concurrent_configuration_change", "unrelated_configuration_change"}
        print(str(error) if str(error) in allowed else "wsl_registration_failed", file=sys.stderr)
        sys.exit(1)
