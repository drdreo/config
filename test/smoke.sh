#!/usr/bin/env bash

set -euo pipefail

ROOT=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
SANDBOX=$(mktemp -d)
trap 'rm -rf "$SANDBOX"' EXIT

export HOME="$SANDBOX/home"
export CONFIG_BACKUP_DIR="$SANDBOX/backups"
mkdir -p "$HOME/.pi/agent/extensions" "$HOME/.agents/skills/external"
printf 'keep me\n' > "$HOME/.agents/skills/external/README.md"
printf 'old extension\n' > "$HOME/.pi/agent/extensions/pi-env.ts"
printf 'existing instructions\n' > "$HOME/.pi/agent/AGENTS.md"

if "$ROOT/bin/config" status >/dev/null 2>&1; then
  printf 'expected initial status to report missing/conflicting items\n' >&2
  exit 1
fi

"$ROOT/bin/config" apply --dry-run >/dev/null
[[ ! -L "$HOME/.pi/agent/extensions/pi-env.ts" ]]
[[ ! -L "$HOME/.pi/agent/AGENTS.md" ]]
grep -q 'existing instructions' "$HOME/.pi/agent/AGENTS.md"

"$ROOT/bin/config" apply >/dev/null
[[ "$(readlink "$HOME/.pi/agent/extensions/pi-env.ts")" == "$ROOT/pi/extensions/pi-env.ts" ]]
[[ "$(readlink "$HOME/.agents/skills/daylog")" == "$ROOT/agents/skills/daylog" ]]
[[ "$(readlink "$HOME/.pi/agent/AGENTS.md")" == "$ROOT/pi/context/AGENTS.md" ]]
find "$CONFIG_BACKUP_DIR" -type f -path '*/.pi/agent/AGENTS.md' -exec grep -l 'existing instructions' {} \; | grep -q .
[[ -f "$HOME/.agents/skills/external/README.md" ]]
find "$CONFIG_BACKUP_DIR" -type f -path '*/.pi/agent/extensions/pi-env.ts' | grep -q .
"$ROOT/bin/config" status >/dev/null

"$ROOT/bin/config" unapply >/dev/null
[[ ! -e "$HOME/.agents/skills/daylog" ]]
[[ ! -e "$HOME/.pi/agent/AGENTS.md" ]]
[[ -f "$HOME/.agents/skills/external/README.md" ]]

python3 -m json.tool "$ROOT/package.json" >/dev/null
printf 'smoke test passed\n'
