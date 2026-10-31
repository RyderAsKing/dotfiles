# dotfiles

This repo stores personal config files in package-style directories.

## Layout

- `bash/` contains Bash dotfiles.
- `tmux/` contains tmux dotfiles.
- `zed/` contains Zed config files.
- `pi/` contains Pi configuration, model modes, extensions, skills, prompts, and themes.
- `pichamber/` contains PiChamber user settings such as `settings.json`, `pi/snippets.json`, and `stt/config.json`.
- `agents/` contains shared agent skills in `~/.agents/skills`, loaded natively by Pi and linked into Claude Code by the `claude` package.
- `claude/` contains Claude Code global instructions, settings, hooks, shared skill links, and legacy MCP helper scripts. Delegation uses T3 Code.
- `cursor/` contains Cursor subagent config. It pins the Explore subagent to Composer 2.5 slow and holds user-level subagents.

For package directories, paths are mirrored from `$HOME` inside each package. Example:

- `zed/.config/zed/settings.json` -> `~/.config/zed/settings.json`
- `zed/.config/zed/keymap.json` -> `~/.config/zed/keymap.json`
- `pi/.pi/agent/settings.json` -> `~/.pi/agent/settings.json`
- `pichamber/.config/pichamber/settings.json` -> `~/.config/pichamber/settings.json`
- `pichamber/.config/pichamber/pi/snippets.json` -> `~/.config/pichamber/pi/snippets.json`
- `agents/.agents/skills` -> `~/.agents/skills`
- `claude/.claude/settings.json` -> `~/.claude/settings.json`
- `cursor/.cursor/agents` -> `~/.cursor/agents`
- `cursor/.cursor/bin/apply-explore-slow.sh` -> `~/.cursor/bin/apply-explore-slow.sh`

This keeps each tool grouped under its own folder and works well with GNU Stow or manual symlinking.

## Setup with GNU Stow

Install [GNU Stow](https://www.gnu.org/software/stow/) and [fzf](https://github.com/junegunn/fzf), then run the helper from this repository:

```sh
./stow-all.sh
```

The helper opens an `fzf` multi-select picker for `bash`, `tmux`, `zed`, `pi`, `pichamber`, `agents`, `claude`, and `cursor`. Press Tab to toggle packages and Enter to confirm; only the selected packages are stowed. Cancelling the picker or confirming an empty selection makes no changes.

The helper forwards Stow flags to the selected packages, so preview changes before applying them with:

```sh
./stow-all.sh --simulate --verbose
```

Stow keeps its default conflict behavior: it reports existing-file conflicts instead of overwriting them.

### Real directories, linked items

Every package follows the same layout: the app's directory in `$HOME` is a real directory, and only the tracked items inside it are symlinks into this repo. For example, `~/.claude` is a real directory, `~/.claude/settings.json` links to `claude/.claude/settings.json`, and `~/.claude/history.jsonl` is a plain local file.

Apps write their own state (credentials, sessions, caches) into these directories, so that state stays on the machine and never lands in the repo.

Left alone, Stow would fold a directory that doesn't exist yet into one symlink, so the app would write its state straight into the repo. `stow-all.sh` prevents that by creating the directories listed in its `real_dirs` table before stowing. It also stops with an error if one of them is still a directory symlink. When an app starts writing into a new subdirectory, add that subdirectory to `real_dirs`.

To track a new item, move it into the package and restow:

```sh
mv ~/.claude/commands claude/.claude/commands
stow -R claude
```

## Pi

The Pi package currently provides:

- `modes.json` with Muse Spark 1.3 Contributor through OpenCode Go for all modes, in cycle order:
  - `economy`: medium thinking (blue).
  - `balance`: high thinking (pink).
  - `premium`: xhigh thinking (gold).
- `Shift+Tab` cycles modes (replacing Pi's default thinking-level shortcut).
- `token-speed.ts` shows lightweight live TPS and TTFT readings in Pi's footer, colors TPS by speed, and uses provider output usage for the final reading when available.
- `Ctrl+X` is a leader key: `Ctrl+X`, then `P` opens a searchable command palette; `Ctrl+X`, then `R` opens the session-resume picker; `Ctrl+X`, then `M` opens Pi's full model picker; `Ctrl+X`, then `T` cycles thinking levels.
- `Ctrl+L` also opens Pi's model picker. `/economy`, `/balance`, and `/premium` switch modes directly.
- An Explore subagent, invoked by Pi through the `subagent` tool, runs in an isolated process with Muse Spark 1.3 Contributor/low and read-only tools (`read`, `grep`, `find`, `ls`, and `bash`). It returns structured reconnaissance—file ranges, key code, architecture, and a recommended starting point—to the primary agent; subagent result footers also show TPS and TTFT alongside usage.
- The `subagent` tool is optional for primary agents. Delegated agents are instructed to complete work themselves and leave further delegation to their parent.

Use `Shift+Tab` or one of the direct mode commands. Modes set both the model and its configured thinking variant. You can still explicitly ask Pi to use the `explore` subagent when you want isolated read-only repository research.

Sessions stay in `~/.pi/agent/sessions`, a local directory. PiChamber resolves sessions as `<agentDir>/sessions` and ignores pi's `sessionDir` setting, so don't move them.

## Claude Code

Stowing `claude` links `CLAUDE.md`, `settings.json`, `agy/`, `hooks/`, `mcp/`, and each shared skill into `~/.claude`. `~/.claude/skills` is a real directory because Claude Code syncs account skills into `~/.claude/skills/synced`.

Delegation goes through T3 Code's `delegate_task`. The global instructions default delegated implementation to Pi with Muse Spark 1.3 Contributor at high thinking, with Sonnet medium and Opus low/medium available for harder tasks. UI and design work stays with the main agent, and children do not start further subagents. Enable the corresponding providers in T3; Pi's CLI must be on `PATH` and authenticated with OpenCode Go.

Claude's built-in `Agent` tool remains blocked by settings and a hook. The old helpers in `mcp/pi-mcp.mjs` and `agy/agy-mcp.mjs` are retained as legacy files and are not needed for T3 delegation. Machine-local MCP registrations live in `~/.claude.json` and are not tracked.

Global instructions also cover Git/shipping, LAN dev servers, UI screenshots, and design preferences. Project-specific deployment commands and agent memories stay outside dotfiles; consult the project's deployment or infra docs when asked to deploy.

### Global and project CLAUDE.md

Claude Code loads every `CLAUDE.md` that applies and combines them. It does not pick one:

| File | Loads | Put here |
|---|---|---|
| `~/.claude/CLAUDE.md` (this repo) | Every session, in any directory | Shared workflow, T3 delegation tiers, design preferences, and the safety guard |
| `<repo>/CLAUDE.md` or `<repo>/.claude/CLAUDE.md` | Sessions started inside that repo | Facts about that codebase: test and lint commands, layout, conventions, Matt's `## Agent skills` block |
| `CLAUDE.md` in a parent directory, e.g. `~/work/CLAUDE.md` | Sessions started below it | Rules shared by a group of repos |
| `CLAUDE.md` in a subdirectory | Once Claude reads files in that subdirectory | Rules for one part of a large repo |

Keep the global file to personal working rules and project files to project facts. Don't let them contradict each other: Claude gets both and may follow the more specific project file. `/setup-matt-pocock-skills` writes to the project file, never the global one.

## Cursor

The Cursor package pins the Explore subagent to Composer 2.5 slow. That means `fast=false` on `composer-2.5` for every child run, on every machine.

`~/.cursor/cli-config.json` holds machine state like auth and caches, so it is never tracked. Stow links the safe parts and a script applies the pin:

```sh
stow cursor
~/.cursor/bin/apply-explore-slow.sh
```

Restart pi after applying. `/cursor-refresh-config` is worth a try first, restart is the reliable path.

Per repo override, shared with the team through git:

```sh
~/.cursor/bin/apply-explore-slow.sh --project /path/to/repo
```

That writes `<repo>/.cursor/cli.json` with the same pin. Deeper files win when several apply.

Custom subagents need the model in each file. Use this frontmatter line so they match:

```md
model: composer-2.5[fast=false]
```

Keep `PI_CURSOR_SETTING_SOURCES` unset or at all. Narrowing it to none stops the SDK from reading user and project layers, which drops the pin.

## Shared skills

Skills that every agent should get live in `agents/.agents/skills/`. Pi reads `~/.agents/skills` directly. Claude Code only reads `~/.claude/skills`, so each shared skill also needs a relative link in the `claude` package:

```sh
ln -s ../../../agents/.agents/skills/<name> claude/.claude/skills/<name>
```

Pi-only skills go in `pi/.pi/agent/skills/`.

`setup-screenshots` sets up a repository's screenshot command, with desktop/mobile captures, before/after folders, and app-specific demo data and login. It reuses existing browser tooling where possible and includes a Playwright starter to avoid rebuilding the capture loop each time. Invoke it in the app repository; dotfiles only stores the shared skill and starter.

### Matt Pocock's skills

27 of the shared skills are copied from [mattpocock/skills](https://github.com/mattpocock/skills) at commit `49dd158` (MIT, see `agents/.agents/skills/LICENSE-mattpocock-skills`). They are the skills listed in that repo's `.claude-plugin/plugin.json`, from `skills/engineering/` and `skills/productivity/`. They don't update themselves. To update, clone the repo again, copy those folders over the ones here, and add a link for any new skill. Run `/setup-matt-pocock-skills` once in each project to choose the issue tracker, triage labels and docs location.
