# Enable OpenCode's native experimental Plan Mode only inside Tmux.
if [ -n "${TMUX:-}" ]; then
  alias opencode='env OPENCODE_EXPERIMENTAL_PLAN_MODE=1 opencode'
fi
