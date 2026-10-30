#!/usr/bin/env bash
# PreToolUse hook: block Claude's built-in subagents.
cat <<'EOF'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Built-in subagents are disabled."}}
EOF
