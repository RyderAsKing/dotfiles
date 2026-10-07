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
packages=(bash tmux zed pi pichamber agents claude cursor)

# Directories that must exist as real directories in $HOME before stowing.
# Without them Stow folds a package into one directory symlink, and the app's
# own state (sessions, caches, credentials) then gets written into this repo.
# List every directory the app writes into; only tracked items inside get linked.
declare -A real_dirs=(
  [bash]=".bashrc.d"
  [zed]=".config/zed"
  [pi]=".pi/agent"
  [pichamber]=".config/pichamber .config/pichamber/pi .config/pichamber/stt"
  [agents]=".agents"
  [claude]=".claude .claude/skills"
  [cursor]=".cursor .cursor/agents .cursor/bin"
)

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

simulate=false
for arg in "$@"; do
  case $arg in -n | --no | --simulate) simulate=true ;; esac
done

for package in "${selected_packages[@]}"; do
  for dir in ${real_dirs[$package]:-}; do
    if [[ -L $HOME/$dir ]]; then
      printf 'Error: ~/%s is a symlink; replace it with a real directory first.\n' "$dir" >&2
      exit 1
    fi
    if ! $simulate; then
      mkdir -p -- "$HOME/$dir"
    fi
  done
done

stow --dir="$repo_root" --target="$HOME" "$@" "${selected_packages[@]}"
