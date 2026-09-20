#!/usr/bin/env bash

set -euo pipefail

ROOT=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
SANDBOX=$(mktemp -d)
trap 'rm -rf "$SANDBOX"' EXIT

export HOME="$SANDBOX/home"
# Do not let caller overrides direct fixture operations into live config.
export AGENTS_HOME="$HOME/.agents"
export PI_CODING_AGENT_DIR="$HOME/.pi/agent"
export CONFIG_BACKUP_DIR="$SANDBOX/backups"
mkdir -p "$HOME/.pi/agent/extensions" "$HOME/.pi/agent/prompts" "$HOME/.agents/skills/external"
printf 'user prompt\n' > "$HOME/.pi/agent/prompts/external.md"
printf 'old prompt\n' > "$HOME/.pi/agent/prompts/code-review.md"
printf 'keep me\n' > "$HOME/.agents/skills/external/README.md"
printf 'old extension\n' > "$HOME/.pi/agent/extensions/pi-env.ts"
printf 'existing instructions\n' > "$HOME/.pi/agent/AGENTS.md"

if "$ROOT/bin/config" status >/dev/null 2>&1; then
  printf 'expected initial status to report missing/conflicting items\n' >&2
  exit 1
fi

"$ROOT/bin/config" apply --dry-run >/dev/null
[[ ! -L "$HOME/.pi/agent/extensions/pi-env.ts" ]]
[[ ! -L "$HOME/.pi/agent/prompts/code-review.md" ]]
[[ ! -L "$HOME/.pi/agent/AGENTS.md" ]]
grep -q 'existing instructions' "$HOME/.pi/agent/AGENTS.md"

"$ROOT/bin/config" apply >/dev/null
[[ "$(readlink "$HOME/.pi/agent/extensions/pi-env.ts")" == "$ROOT/pi/extensions/pi-env.ts" ]]
[[ "$(readlink "$HOME/.agents/skills/daylog")" == "$ROOT/agents/skills/daylog" ]]
[[ "$(readlink "$HOME/.pi/agent/AGENTS.md")" == "$ROOT/pi/context/AGENTS.md" ]]
find "$CONFIG_BACKUP_DIR" -type f -path '*/.pi/agent/AGENTS.md' -exec grep -l 'existing instructions' {} \; | grep -q .
[[ "$(readlink "$HOME/.pi/agent/prompts/code-review.md")" == "$ROOT/pi/prompts/code-review.md" ]]
[[ -f "$HOME/.pi/agent/prompts/external.md" ]]
find "$CONFIG_BACKUP_DIR" -type f -path '*/.pi/agent/prompts/code-review.md' | grep -q .
[[ -f "$HOME/.agents/skills/external/README.md" ]]
find "$CONFIG_BACKUP_DIR" -type f -path '*/.pi/agent/extensions/pi-env.ts' | grep -q .
"$ROOT/bin/config" status >/dev/null

"$ROOT/bin/config" unapply >/dev/null
[[ ! -e "$HOME/.agents/skills/daylog" ]]
[[ ! -e "$HOME/.pi/agent/AGENTS.md" ]]
[[ ! -e "$HOME/.pi/agent/prompts/code-review.md" ]]
[[ -f "$HOME/.pi/agent/prompts/external.md" ]]
[[ -f "$HOME/.agents/skills/external/README.md" ]]

python3 -m json.tool "$ROOT/package.json" >/dev/null
printf 'smoke test passed\n'
