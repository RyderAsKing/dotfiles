---
name: kodachi-add-skill
description: Add a project-specific or global OpenCode skill by writing a SKILL.md file to the correct location
compatibility: opencode
---

## What I do

Create a new OpenCode skill by writing a `SKILL.md` file at the appropriate path, then confirm it is picked up.

## Skill file format

```markdown
---
name: <skill-name>
description: <one-line description>
compatibility: opencode
---

## What I do

<skill purpose>

## How to use / Rules

<instructions, examples, constraints>
```

## Paths

| Scope   | Path                                                         |
| ------- | ------------------------------------------------------------ |
| Project | `<project_root>/.opencode/skills/<name>/SKILL.md`            |
| Global  | `~/.config/opencode/skills/<name>/SKILL.md`                  |

Use **project scope** for skills specific to one codebase.
Use **global scope** for skills that apply across all projects.

## Steps

1. Ask the user for: skill name, scope (project or global), description, and content — unless already provided.
2. Derive the target path from the table above.
3. Create the directory and write `SKILL.md` with the format above.
4. Confirm the file was written and show the path.

## Rules

- Skill name: lowercase alphanumeric and hyphens only (e.g. `my-skill`).
- Never overwrite an existing skill without explicit confirmation.
- Project root for the current session is the working directory OpenCode has open.
