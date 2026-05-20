---
name: kodachi-restart
description: Restart the Kodachi Discord bridge process via pm2
compatibility: opencode
---

## What I do

Schedule a graceful restart of the Kodachi bot so the current response is delivered before the process goes offline.

## How to restart

Run this via the bash tool:

```bash
nohup sh -c 'sleep 10 && pm2 restart all' >/tmp/kodachi-restart.log 2>&1 &
```

It returns immediately. Kodachi goes offline after ~10 seconds and pm2 brings it back up. `nohup` keeps the scheduled restart alive even if the current session exits.

## When to use

- After config changes that require a full restart (e.g. new env vars, changed `OPENCODE_URL`)
- When the bot is unresponsive and `/abort` has not resolved it
- When explicitly asked by the user

Always inform the user that a restart is scheduled and that the bot will be back in a few seconds.
