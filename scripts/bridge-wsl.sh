#!/usr/bin/env bash
set -euo pipefail
action="${1:-doctor}"
case "$action" in install|configure|start|stop|doctor|test) ;; *) echo "Unsupported bridge action" >&2; exit 2;; esac
root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
entry="$(wslpath -w "$root/scripts/bridge.ps1")"
# The runtime remains Windows. This does not start a GUI or a WSL Hermes instance.
exec powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$entry" "$action"
