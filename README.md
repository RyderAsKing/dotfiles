# dotfiles

This repo stores personal config files in package-style directories.

## Layout

- `bash/` contains Bash dotfiles.
- `tmux/` contains tmux dotfiles.
- `zed/` contains Zed config files.
- `opencode/` contains user-authored OpenCode config such as `opencode.json`, `tui.json`, skills, commands, and agents.
- `pi/` contains Pi configuration, model modes, extensions, skills, prompts, and themes.
- `pichamber/` contains PiChamber user settings such as `settings.json`, `pi/snippets.json`, and `stt/config.json`.
- `agents/` contains shared agent skills in `~/.agents/skills`, loaded natively by Pi and linked into Claude Code by the `claude` package.
- `claude/` contains Claude Code config: `CLAUDE.md`, `settings.json`, hooks, and the `pi` MCP server that delegates work to Pi agents.

For package directories, paths are mirrored from `$HOME` inside each package. Example:

- `zed/.config/zed/settings.json` -> `~/.config/zed/settings.json`
- `zed/.config/zed/keymap.json` -> `~/.config/zed/keymap.json`
- `opencode/.config/opencode/opencode.json` -> `~/.config/opencode/opencode.json`
- `opencode/.config/opencode/skills` -> `~/.config/opencode/skills`
- `pi/.pi/agent` -> `~/.pi/agent`
- `pichamber/.config/pichamber/settings.json` -> `~/.config/pichamber/settings.json`
- `pichamber/.config/pichamber/pi/snippets.json` -> `~/.config/pichamber/pi/snippets.json`
- `agents/.agents/skills` -> `~/.agents/skills`
- `claude/.claude/settings.json` -> `~/.claude/settings.json`
- `claude/.claude/mcp/pi-mcp.mjs` -> `~/.claude/mcp/pi-mcp.mjs`

This keeps each tool grouped under its own folder and works well with GNU Stow or manual symlinking.

## Setup with GNU Stow

Install [GNU Stow](https://www.gnu.org/software/stow/) and [fzf](https://github.com/junegunn/fzf), then run the helper from this repository:

```sh
./stow-all.sh
```

The helper opens an `fzf` multi-select picker for `bash`, `tmux`, `zed`, `opencode`, `pi`, `pichamber`, `agents`, and `claude`. Press Tab to toggle packages and Enter to confirm; only the selected packages are stowed. Cancelling the picker or confirming an empty selection makes no changes.

The helper forwards Stow flags to the selected packages, so preview changes before applying them with:

```sh
./stow-all.sh --simulate --verbose
```

Stow keeps its default conflict behavior: it reports existing-file conflicts instead of overwriting them.

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

Sessions live outside the repo at `~/.local/share/pi/sessions`, linked from `pi/.pi/agent/sessions`. The link stays ignored by git. On a fresh clone, recreate it with:

```sh
mkdir -p ~/.local/share/pi
ln -s ~/.local/share/pi/sessions ~/dotfiles/pi/.pi/agent/sessions
```

This is a directory link on purpose. PiChamber resolves sessions as `<agentDir>/sessions` directly and ignores pi's `sessionDir` setting, so moving them via settings would split sessions between two places.

## OpenCode

The OpenCode package intentionally tracks only personal configuration and customizations:

- `opencode.json`
- `tui.json`
- `themes/`
- `skills/`
- `commands/` when present
- `agents/` when present

Local dependency and vendor files stay directly in `~/.config/opencode` and are not part of this repo:

- `package.json`
- `package-lock.json`
- `bun.lock`
- `node_modules/`

This lets `stow opencode` manage the config files while leaving machine-local package files alone.

## Claude Code

Stowing `claude` links only user-authored files into `~/.claude`; Claude Code's own state (sessions, history, credentials, `~/.claude.json`) stays local.

MCP servers are registered in `~/.claude.json`, which is not tracked, so register the `pi` delegation server once per machine:

```sh
claude mcp add --scope user pi -- node "$HOME/.claude/mcp/pi-mcp.mjs"
```

## Shared skills

Skills that every agent should get live in `agents/.agents/skills/`. Pi reads `~/.agents/skills` directly. Claude Code only reads `~/.claude/skills`, so each shared skill also needs a relative link in the `claude` package:

```sh
ln -s ../../../agents/.agents/skills/<name> claude/.claude/skills/<name>
stow -R claude
```

Pi-only skills go in `pi/.pi/agent/skills/`.

