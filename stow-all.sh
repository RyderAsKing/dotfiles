#!/usr/bin/env bash

set -euo pipefail

if ! command -v stow >/dev/null 2>&1; then
  printf 'Error: GNU Stow is required but was not found in PATH.\n' >&2
  exit 1
fi

if ! command -v fzf >/dev/null 2>&1; then
  printf 'Error: fzf is required but was not found in PATH.\n' >&2
  exit 1
fi

repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
packages=(bash tmux zed opencode)

if ! selected_output=$(printf '%s\n' "${packages[@]}" | fzf \
  --multi \
  --prompt='Packages> ' \
  --header='Tab: toggle | Enter: confirm'); then
  exit 0
fi

if [[ -z $selected_output ]]; then
  exit 0
fi

mapfile -t selected_packages <<< "$selected_output"

stow --dir="$repo_root" --target="$HOME" "$@" "${selected_packages[@]}"
