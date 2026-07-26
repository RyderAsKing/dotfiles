# dotfiles

This repo stores personal config files in package-style directories.

## Layout

- `bash/` contains Bash dotfiles.
- `tmux/` contains tmux dotfiles.
- `zed/` contains Zed config files.
- `opencode/` contains user-authored OpenCode config such as `opencode.json`, `tui.json`, skills, commands, and agents.

For package directories, paths are mirrored from `$HOME` inside each package. Example:

- `zed/.config/zed/settings.json` -> `~/.config/zed/settings.json`
- `zed/.config/zed/keymap.json` -> `~/.config/zed/keymap.json`
- `opencode/.config/opencode/opencode.json` -> `~/.config/opencode/opencode.json`
- `opencode/.config/opencode/skills` -> `~/.config/opencode/skills`

This keeps each tool grouped under its own folder and works well with GNU Stow or manual symlinking.

## Setup with GNU Stow

Install [GNU Stow](https://www.gnu.org/software/stow/) and [fzf](https://github.com/junegunn/fzf), then run the helper from this repository:

```sh
./stow-all.sh
```

The helper opens an `fzf` multi-select picker for `bash`, `tmux`, `zed`, and `opencode`. Press Tab to toggle packages and Enter to confirm; only the selected packages are stowed. Cancelling the picker or confirming an empty selection makes no changes.

The helper forwards Stow flags to the selected packages, so preview changes before applying them with:

```sh
./stow-all.sh --simulate --verbose
```

Stow keeps its default conflict behavior: it reports existing-file conflicts instead of overwriting them.

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
