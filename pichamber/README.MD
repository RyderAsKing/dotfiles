# pichamber

Tracks only user-authored PiChamber config:

- `.config/pichamber/settings.json`
- `.config/pichamber/pi/snippets.json`
- `.config/pichamber/stt/config.json`

The rest of `~/.config/pichamber` stays machine-local and is not part of this repo:

- `discovered-apps.json` (cache)
- `jwt-secret`, `pi/session-daemon.key` (secrets)
- `logs/`, `*.tmp-*` (runtime)
- `pi/daemons/`, `session-daemon.lock`, `session-archive.json` (runtime)
- `speech-models/` (large binaries)
- `worktree/` (runtime checkouts)

## Note: re-stowing after the app saves

PiChamber rewrites `settings.json` (and `pi/snippets.json` when edited in
the UI) via atomic rename, which replaces the Stow symlink with a regular
file. When that happens, pull the latest content back into the repo and
restore the link with:

```sh
cd ~/dotfiles && stow --adopt pichamber
```

Then review the diff with `git diff` before committing, since the app also
stores runtime UI state like `activeProjectId` and window geometry in
`settings.json`.
