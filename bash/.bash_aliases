# OpenCode planner integration
# The Tmux override loads only in interactive shells that start inside Tmux.

# opencode-planner requires an editor command that opens separately and blocks.
# Preserve an explicitly configured editor; Zed's `--wait` fulfils this contract.
if [ -z "${EDITOR:-}" ] && command -v zed >/dev/null 2>&1; then
  export EDITOR="zed --wait"
fi

# Inject the editor-backed planner only for the terminal workflow. GUI and
# headless OpenCode instances continue to use the base configuration.
if [ -n "${TMUX:-}" ]; then
  alias opencode='env -u OPENCODE_EXPERIMENTAL -u OPENCODE_EXPERIMENTAL_PLAN_MODE OPENCODE_CONFIG="$HOME/.config/opencode/cli-planner.json" opencode'
fi
