#!/usr/bin/env bash
# Pin the Cursor Explore subagent to Composer 2.5 slow.
# Stow cannot manage ~/.cursor/cli-config.json directly because that file
# holds machine state like auth, caches, and picker history. This script
# patches only the two relevant keys and leaves everything else alone.
#
# Usage:
#   ~/.cursor/bin/apply-explore-slow.sh
#   ~/.cursor/bin/apply-explore-slow.sh --project /path/to/repo
#
# The --project form writes <repo>/.cursor/cli.json with the same pin.
# Project files merge over home config for that session only.
# Commit that file in the repo when the team should share it.
#
# After applying, restart pi. You can try /cursor-refresh-config first,
# but restart is the reliable path for this key.

set -euo pipefail

MODEL_ID="composer-2.5"
PIN_FILE="$HOME/.cursor/cli-config.json"

apply_home() {
  python3 - "$PIN_FILE" <<'PY'
import json, sys
path = sys.argv[1]
with open(path, encoding="utf-8") as f:
    cfg = json.load(f)
sub = cfg.get("subagentModels")
if not isinstance(sub, dict):
    sub = {}
sub["explore"] = {
    "modelId": "composer-2.5",
    "parameters": [{"id": "fast", "value": "false"}],
}
cfg["subagentModels"] = sub
# Legacy key stays at default when explore is pinned to a specific model,
# so older CLI builds reading the same config behave sensibly.
cfg["exploreSubagentModel"] = "default"
with open(path, "w", encoding="utf-8") as f:
    json.dump(cfg, f, indent=2)
    f.write("\n")
print("explore pinned:")
print(json.dumps(cfg["subagentModels"]["explore"], indent=2))
print("legacy key: " + json.dumps(cfg["exploreSubagentModel"]))
PY
}

apply_project() {
  local repo="$1"
  local dest="$repo/.cursor/cli.json"
  mkdir -p "$(dirname "$dest")"
  python3 - "$dest" <<'PY'
import json, os, sys
path = sys.argv[1]
cfg = {}
if os.path.exists(path):
    with open(path, encoding="utf-8") as f:
        cfg = json.load(f)
sub = cfg.get("subagentModels")
if not isinstance(sub, dict):
    sub = {}
sub["explore"] = {
    "modelId": "composer-2.5",
    "parameters": [{"id": "fast", "value": "false"}],
}
cfg["subagentModels"] = sub
with open(path, "w", encoding="utf-8") as f:
    json.dump(cfg, f, indent=2)
    f.write("\n")
print("wrote " + path)
PY
}

if [ "${1:-}" = "--project" ]; then
  if [ -z "${2:-}" ]; then
    echo "usage: apply-explore-slow.sh --project /path/to/repo" >&2
    exit 1
  fi
  apply_project "$2"
else
  apply_home
  echo "Restart pi to pick this up. /cursor-refresh-config is worth a try first."
fi
