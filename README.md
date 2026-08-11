# dotfiles

This repo stores personal config files in package-style directories.

## Layout

- `bash/` contains Bash dotfiles.
- `tmux/` contains tmux dotfiles.
- `zed/` contains Zed config files.
- `opencode/` contains user-authored OpenCode config such as `opencode.json`, `tui.json`, skills, commands, and agents.
- `pi/` contains Pi configuration, model modes, extensions, skills, prompts, and themes.

For package directories, paths are mirrored from `$HOME` inside each package. Example:

- `zed/.config/zed/settings.json` -> `~/.config/zed/settings.json`
- `zed/.config/zed/keymap.json` -> `~/.config/zed/keymap.json`
- `opencode/.config/opencode/opencode.json` -> `~/.config/opencode/opencode.json`
- `opencode/.config/opencode/skills` -> `~/.config/opencode/skills`
- `pi/.pi/agent` -> `~/.pi/agent`

This keeps each tool grouped under its own folder and works well with GNU Stow or manual symlinking.

## Setup with GNU Stow

Install [GNU Stow](https://www.gnu.org/software/stow/) and [fzf](https://github.com/junegunn/fzf), then run the helper from this repository:

```sh
./stow-all.sh
```

The helper opens an `fzf` multi-select picker for `bash`, `tmux`, `zed`, `opencode`, and `pi`. Press Tab to toggle packages and Enter to confirm; only the selected packages are stowed. Cancelling the picker or confirming an empty selection makes no changes.

The helper forwards Stow flags to the selected packages, so preview changes before applying them with:

```sh
./stow-all.sh --simulate --verbose
```

Stow keeps its default conflict behavior: it reports existing-file conflicts instead of overwriting them.

## Pi

The Pi package currently provides:

- `modes.json` with affordability-based model modes, in cycle order:
  - `economy`: DeepSeek V4 Flash with max thinking (blue).
  - `balance`: Luna with max thinking (pink).
  - `premium`: Terra with high thinking (gold).
- `Shift+Tab` cycles modes (replacing Pi's default thinking-level shortcut).
- `token-speed.ts` shows lightweight live TPS and TTFT readings in Pi's footer, colors TPS by speed, and uses provider output usage for the final reading when available.
- `Ctrl+X` is a leader key: `Ctrl+X`, then `P` opens a searchable command palette; `Ctrl+X`, then `R` opens the session-resume picker; `Ctrl+X`, then `M` opens Pi's full model picker; `Ctrl+X`, then `T` cycles thinking levels.
- `Ctrl+L` also opens Pi's model picker. `/economy`, `/balance`, and `/premium` switch modes directly.
- Plan mode (`/plan`, `/todos`, and `Ctrl+Alt+P`) uses GPT-5.6 Sol with medium thinking, then restores the previously active mode before execution or when planning is disabled.
- An Explore subagent, invoked by Pi through the `subagent` tool, runs in an isolated process with DeepSeek V4 Flash/low and read-only tools (`read`, `grep`, `find`, `ls`, and `bash`). It returns structured reconnaissance—file ranges, key code, architecture, and a recommended starting point—to the primary agent; subagent result footers also show TPS and TTFT alongside usage.
- The `subagent` tool's prompt guidance tells primary agents to prefer Explore for nontrivial read-only codebase discovery before planning or editing, while keeping simple known-file lookups local. Because the child receives only read-only tools, this guidance is not included in Explore's prompt.

Use `Shift+Tab` or one of the direct mode commands. Modes set both the model and its configured thinking variant; the plan extension remains separate and read-only until you choose to execute its plan. You can still explicitly ask Pi to use the `explore` subagent when you want isolated read-only repository research.

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
