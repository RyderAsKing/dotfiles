---
name: setup-screenshots
description: Set up a repeatable screenshot command for a web app, including demo data, login, and desktop/mobile captures. Use when creating or repairing a repository's screenshot workflow.
---

# Setup screenshots

Leave the repository with one command that captures useful, populated UI without rediscovering login, data, and routes on every run. Keep the setup small.

1. Inspect the app's run command, existing browser tooling, screenshot scripts, and demo seeders. Extend a working harness instead of adding another. Prefer the installed browser library; otherwise add Playwright as a dev dependency using the repo's package manager.
2. Pick a few representative pages or the states the user requested. For data-driven pages, reuse factories or add a small, idempotent screenshot seed for a dedicated local/test database. Use fixed synthetic names, dates, and local assets. Include representative populated states and any requested empty/error states. Never reset a shared database or call real billing, email, or publishing services.
3. Reuse test login or a dedicated demo account. Keep credentials and saved browser sessions ignored. For client-rendered apps, narrow API mocks with checked-in fixtures are an alternative; they cannot seed server-rendered data. Say which approach the screenshots use.
4. Create or adapt `scripts/screenshots.mjs`. [The starter](assets/screenshots.mjs) provides viewport loops, state hooks, readiness checks, and output paths; copy and tailor it rather than reading it into context unless needed. Replace its sample page, readiness selector, and hooks with the app's actual routes, data, and login. Keep production application code unchanged solely for screenshot setup.
5. Add a `screenshots` package command, or an equivalent script for non-Node repos. Ignore `.screenshots/` and local browser auth. Document the run command, base URL, demo-data preparation, and available page/state names in one short section of the existing agent instructions. Reuse the running dev server; document its startup command if none is running.
6. Run the command against local/test UI and inspect one representative capture. Confirm expected demo content rather than a login screen, error page, or loading shell. Finish with the exact command and output directory. Report missing runtime dependencies or login blockers without claiming setup passed.

The generated command should accept `BASE_URL`, a before/after label, and optional page names. Capture matching desktop/mobile viewports, wait for named UI content and fonts rather than arbitrary sleeps, disable animation, and close the browser on failure. Keep before/after files separate; never fabricate a missing before capture from the after UI.

For ordinary follow-up UI work, use the generated command and its documented states. Rerun setup only when the app's routes, authentication, or data preparation change. Uploading images or editing a PR is a separate task; local image paths are not public PR attachments.
