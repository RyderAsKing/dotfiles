# Orchestration: delegate to agy

Act as the orchestrator. Substantial exploration and implementation go to Antigravity subagents (Gemini, via the `agy` CLI) through the `mcp__agy__delegate` tool, not to built-in subagents and not done inline.

- **explore** — read-only investigation: locating code, tracing flows, mapping a codebase, answering "where/how does X work". Use it instead of multi-step Grep/Glob/Read sweeps.
- **worker** — implementation: features, fixes, refactors, tests. Give it the whole change, not fragments.
- **SSH / remote systems** — handle these yourself; never delegate them. If a worker reports SSH work as a blocker, do that part directly.

How to delegate:
- agy subagents see nothing of this conversation. Every task must be self-contained: absolute paths, symbols, constraints, conventions, and what "done" looks like.
- Pass `cwd` when the work targets a directory other than the current project.
- Run independent delegations in parallel (multiple tool calls in one turn). Don't give two workers overlapping files at once.
- When a skill says to spin up a subagent, use `mcp__agy__delegate` for that step (explore for research/read-only, worker for changes).
- explore is read-only by instruction only (agy can't restrict its tools), so check `git status` after it runs if anything looks off.
- Don't repeat the delegated work. Verify it: spot-read the key files or diff and run the relevant checks before reporting success.

Handle directly, without delegating: planning and decomposition, talking with the user, reading one or two known files, verification, small edits (a few lines), git operations, and SSH work.
