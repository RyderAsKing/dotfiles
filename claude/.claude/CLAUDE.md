# Safety guard

Before work involving authentication, secrets, SSH or other external systems, or delegating to subagents, load the `claude-safety-guard` skill and follow it.

## Git and shipping

- Before starting repository work, fetch the latest default branch and bring the working branch up to date as appropriate. Fast-forward a clean default-branch checkout; preserve local changes and ongoing branch work.
- "Ship it" or "merge it" authorizes logical commits, push, opening a PR, merging it, and updating the local default branch. Complete those steps without asking about each one.
- Run manual production deployments only when I ask to deploy. Check the repository's deployment docs before shipping and call out when a merge or push itself deploys to production.
- No co-author lines in commits or PRs.

## Dev servers

When asked to serve or preview an app, reuse its running dev server or start one bound to `0.0.0.0`, then provide the LAN URL. Use one dev setup per repository.

## Subagents

When delegation is useful, use T3 `delegate_task` and choose the least expensive tier suited to the task. In order from strongest to default:

1. Opus 5.5 medium: provider `claudeAgent`, model `claude-opus-5-5`, `target.options.effort: "medium"`. Hard, important work such as architecture, tricky bugs, security, billing, and data migrations.
2. Opus 5.5 low: provider `claudeAgent`, model `claude-opus-5-5`, `target.options.effort: "low"`. Important work requiring thought with less complexity.
3. Sonnet 5.5 medium: provider `claudeAgent`, model `claude-sonnet-5-5`, `target.options.effort: "medium"`. Work requiring more judgment than Muse without needing Opus.
4. Muse Spark 1.3 high, the default: provider `pi`, model `opencode-go/muse-spark-1.3-contributor`, `target.options.thinking: "high"`. Basic implementation, clear tickets, mechanical changes, tests, docs, and follow-ups.

- Set the model and effort or thinking explicitly for every delegation. Escalate only when the task needs it; never use xhigh for a subagent.
- Keep UI and design work with the main agent.
- Run at most three subagents concurrently. Tell each child to do its own work and return results or blockers without starting further subagents.
- Follow T3's returned `next` instruction instead of polling children in sleep loops.

## Screenshots

- If a repository lacks a repeatable screenshot command, use the `setup-screenshots` skill to create one with appropriate demo data and login.
- For PRs that change UI, include before/after screenshots at desktop and mobile sizes in the PR body, using the repository's screenshot script.
- Group related UI edits before capturing screenshots. Inspect each relevant capture once and reuse it until the UI changes or a specific uncertainty requires another look.

## Design taste

- Keep icons to a minimum. No emoji in the UI.
- No glow effects, beams, twinkles, or decorative animation unless I ask for them.
- No card inside a card.
- Pages are full width unless the design says otherwise. Keep the frame width consistent across pages.
- Balance text wrapping in headings and paragraphs with `text-wrap: balance` or `pretty`. Avoid orphan words and mobile overflow.
