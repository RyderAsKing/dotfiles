# dotfiles

This repo stores personal config files in package-style directories.

## Layout

- `tmux/` contains tmux dotfiles.
- `zed/` contains Zed config files.
- `opencode/` contains user-authored OpenCode config such as `opencode.json`, `tui.json`, skills, commands, and agents.

For package directories, paths are mirrored from `$HOME` inside each package. Example:

- `zed/.config/zed/settings.json` -> `~/.config/zed/settings.json`
- `zed/.config/zed/keymap.json` -> `~/.config/zed/keymap.json`
- `opencode/.config/opencode/opencode.json` -> `~/.config/opencode/opencode.json`
- `opencode/.config/opencode/skills` -> `~/.config/opencode/skills`

This keeps each tool grouped under its own folder and works well with GNU Stow or manual symlinking.

## OpenCode

The OpenCode package intentionally tracks only personal configuration and customizations:

- `opencode.json`
- `tui.json`
- `skills/`
- `commands/` when present
- `agents/` when present

Local dependency and vendor files stay directly in `~/.config/opencode` and are not part of this repo:

- `package.json`
- `package-lock.json`
- `bun.lock`
- `node_modules/`

This lets `stow opencode` manage the config files while leaving machine-local package files alone.
