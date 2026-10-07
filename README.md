# dotfiles

This repo stores personal config files in package-style directories.

## Layout

- `bash/` contains Bash dotfiles.
- `tmux/` contains tmux dotfiles.
- `zed/` contains Zed config files.
- `pi/` contains Pi configuration, model modes, extensions, skills, prompts, and themes.
- `pichamber/` contains PiChamber user settings such as `settings.json`, `pi/snippets.json`, and `stt/config.json`.
- `agents/` contains shared agent skills in `~/.agents/skills`, loaded natively by Pi and linked into Claude Code by the `claude` package.
- `claude/` contains Claude Code config: `CLAUDE.md`, `settings.json`, hooks, and the `agy` MCP server that delegates work to Antigravity agents.
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

- `modes.json` with affordability-based model modes, in cycle order:
  - `economy`: DeepSeek V4.1 Flash (opencode-go) with max thinking (blue).
  - `balance`: Luna with max thinking (pink).
  - `premium`: Sol with low thinking (gold).
- `Shift+Tab` cycles modes (replacing Pi's default thinking-level shortcut).
- `token-speed.ts` shows lightweight live TPS and TTFT readings in Pi's footer, colors TPS by speed, and uses provider output usage for the final reading when available.
- `Ctrl+X` is a leader key: `Ctrl+X`, then `P` opens a searchable command palette; `Ctrl+X`, then `R` opens the session-resume picker; `Ctrl+X`, then `M` opens Pi's full model picker; `Ctrl+X`, then `T` cycles thinking levels.
- `Ctrl+L` also opens Pi's model picker. `/economy`, `/balance`, and `/premium` switch modes directly.
- Plan mode (`/plan`, `/todos`, and `Ctrl+Alt+P`) uses GPT-6 Sol with medium thinking, then restores the previously active mode before execution or when planning is disabled.
- An Explore subagent, invoked by Pi through the `subagent` tool, runs in an isolated process with DeepSeek V4.1 Flash/low and read-only tools (`read`, `grep`, `find`, `ls`, and `bash`). It returns structured reconnaissance—file ranges, key code, architecture, and a recommended starting point—to the primary agent; subagent result footers also show TPS and TTFT alongside usage.
- The `subagent` tool's prompt guidance tells primary agents to prefer Explore for nontrivial read-only codebase discovery before planning or editing, while keeping simple known-file lookups local. Because the child receives only read-only tools, this guidance is not included in Explore's prompt.

Use `Shift+Tab` or one of the direct mode commands. Modes set both the model and its configured thinking variant; the plan extension remains separate and read-only until you choose to execute its plan. You can still explicitly ask Pi to use the `explore` subagent when you want isolated read-only repository research.

Sessions stay in `~/.pi/agent/sessions`, a local directory. PiChamber resolves sessions as `<agentDir>/sessions` and ignores pi's `sessionDir` setting, so don't move them.

## Claude Code

Stowing `claude` links `CLAUDE.md`, `settings.json`, `agy/`, `hooks/`, `mcp/`, and each shared skill into `~/.claude`. `~/.claude/skills` is a real directory because Claude Code syncs account skills into `~/.claude/skills/synced`.

Delegation goes to Antigravity (Gemini) subagents through the `agy` MCP server in `agy/agy-mcp.mjs`. Agents are defined in `agy/agents/*.md`. The `agy` CLI has to be on `PATH`. MCP servers are registered in `~/.claude.json`, which is not tracked, so register the server once per machine:

```sh
claude mcp add --scope user agy -- node "$HOME/.claude/agy/agy-mcp.mjs"
```

The older `pi` delegation server is still in `mcp/pi-mcp.mjs`. Register it the same way to switch back: `claude mcp add --scope user pi -- node "$HOME/.claude/mcp/pi-mcp.mjs"`.

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

