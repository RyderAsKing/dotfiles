# dotfiles

This repo stores personal config files in package-style directories.

## Layout

- `tmux/` contains tmux dotfiles.
- `zed/` contains Zed config files.

For package directories, paths are mirrored from `$HOME` inside each package. Example:

- `zed/.config/zed/settings.json` -> `~/.config/zed/settings.json`
- `zed/.config/zed/keymap.json` -> `~/.config/zed/keymap.json`

This keeps each tool grouped under its own folder and works well with GNU Stow or manual symlinking.
