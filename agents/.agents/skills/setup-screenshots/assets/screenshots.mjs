// Copy to scripts/screenshots.mjs and tailor the cases and hooks to the app.
// BASE_URL=http://127.0.0.1:3000 node scripts/screenshots.mjs after home
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const label = process.argv[2] || 'after';
const selected = process.argv.slice(3);
const cases = [
  { name: 'home', path: '/', ready: 'main' },
  // Add states with an optional async prepare(page) for opening dialogs, etc.
];
const viewports = [
  { name: 'desktop', width: 1440, height: 900, isMobile: false },
  { name: 'mobile', width: 390, height: 844, isMobile: true },
];

async function seed() {
  // Call the repo's idempotent local screenshot seeder here, if needed.
}

async function prepareContext(context) {
  // Add login/cookies or narrow API fixtures before page navigation.
  // Example: await context.route('**/api/projects', route =>
  //   route.fulfill({ json: [{ id: 1, name: 'Demo project' }] }));
}

if (!/^[a-zA-Z0-9_-]+$/.test(label)) throw new Error('Use a simple capture label, e.g. before or after.');
for (const item of cases) {
  if (!/^[a-zA-Z0-9_-]+$/.test(item.name)) throw new Error(`Invalid case name: ${item.name}`);
}
if (new Set(cases.map(item => item.name)).size !== cases.length) throw new Error('Duplicate case names.');
for (const name of selected) {
  if (!cases.some(item => item.name === name)) throw new Error(`Unknown page: ${name}`);
}
const targets = cases.filter(item => selected.length === 0 || selected.includes(item.name));
if (!targets.length) throw new Error('No screenshot cases configured.');
await seed();
const out = path.resolve('.screenshots', label);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME ? { executablePath: process.env.CHROME } : {}),
});
try {
  for (const item of targets) {
    for (const { name, width, height, isMobile } of viewports) {
      const context = await browser.newContext({
        viewport: { width, height }, isMobile, hasTouch: isMobile,
        deviceScaleFactor: 1, colorScheme: 'light', reducedMotion: 'reduce',
        locale: 'en-US', timezoneId: 'UTC', serviceWorkers: 'block',
        ...(process.env.SCREENSHOT_AUTH ? { storageState: process.env.SCREENSHOT_AUTH } : {}),
      });
      try {
        context.setDefaultTimeout(15000);
        await prepareContext(context);
        const page = await context.newPage();
        const response = await page.goto(new URL(item.path, baseURL).href, { waitUntil: 'domcontentloaded' });
        if (!response?.ok()) throw new Error(`${item.name}: HTTP ${response?.status() ?? 'no response'}`);
        if (item.prepare) await item.prepare(page);
        await page.locator(item.ready).waitFor({ state: 'visible' });
        await page.evaluate(() => document.fonts.ready);
        const file = path.join(out, `${item.name}-${name}.png`);
        await page.screenshot({ path: file, fullPage: true, animations: 'disabled', caret: 'hide' });
        console.log(file);
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
