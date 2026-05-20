---
name: kodachi-memory
description: Store persistent memories through the Kodachi bridge
compatibility: opencode
---

## What I do

Store facts, decisions, and preferences to memory so they persist across future sessions.

## How to use

Include a `<kodachi-memory>` tag anywhere in your response:

```
<kodachi-memory scope="project" type="fact">The auth service uses JWT with a 24-hour expiry.</kodachi-memory>
```

The tag is stripped from the visible message before it reaches Discord. The content is stored to the memory service.

## Attributes

- `scope`: `project` (default) or `global`
  - `project` — scoped to the current project only. **Always use this unless the user explicitly says the memory should apply globally.**
  - `global` — available across all projects. Only use when the user explicitly requests it.
- `type`: `fact` (default), `decision`, `preference`, or `observation`

## Rules

- Always default to `scope="project"`. Never choose `scope="global"` on your own judgment — only use it if the user explicitly asks for a global memory.
- Only tag content worth persisting across sessions — do not store ephemeral context
- Keep content concise and specific — injected memories are ranked by relevance
- Multiple tags in one response are fine; each is stored independently
