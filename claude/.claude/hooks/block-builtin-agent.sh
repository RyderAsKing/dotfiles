#!/usr/bin/env bash
# PreToolUse hook: steer delegation to pi instead of Claude's built-in subagents.
cat <<'EOF'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Built-in subagents are disabled. Delegate via the mcp__pi__delegate tool instead (agent: explore for read-only investigation, worker for implementation)."}}
EOF
