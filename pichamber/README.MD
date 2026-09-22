# pichamber

Tracks only user-authored PiChamber config:

- `.config/pichamber/settings.json`
- `.config/pichamber/pi/snippets.json`
- `.config/pichamber/stt/config.json`

`settings.json` is a **portable-v1** file: it keeps the
`"__pichamberSettingsScope": "portable-v1"` marker and contains only portable
preference fields (themes, splash colors, favorites, retention, draft
starters). Host, device, and secret-bearing values (`projects`,
`activeProjectId`, `homeDirectory`, `lastDirectory`, `desktopWindowState`,
`desktopLocalPort`, tunnel and desktop credentials, ...) live in
`runtime-state.json`, which is machine-local and never tracked.

Never commit a flat (marker-less) `settings.json`. PiChamber treats a
marker-less file as legacy and runs a one-time migration that moves its local
fields over the host's `runtime-state.json`, clobbering that host's project
list and session ownership. Retired keys (`collapsibleThinkingBlocks`,
`collapseThinkingByDefault`, ...) are intentionally dropped so saved values
cannot resurrect retired behavior.

The rest of `~/.config/pichamber` stays machine-local and is not part of this repo:

- `runtime-state.json` (host, device, and secret-bearing state)
- `pi/session-folders.json`, `pi/settings.json` (per-host sidebar state and new-session defaults)
- `projects/` (project notes)

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

Then review the diff with `git diff` before committing. A healthy adopted
`settings.json` stays portable-v1; if local fields (`projects`,
`homeDirectory`, ...) appear in it, strip them before committing and make
sure they ended up in this host's `runtime-state.json` instead.
