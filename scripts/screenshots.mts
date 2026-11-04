/**
 * Visual review helper: signs in as a seeded user and screenshots routes at
 * desktop and phone sizes.
 *
 *   node scripts/screenshots.mts <outDir> <email> <route> [route...]
 *   SNAP_VIEWPORTS=mobile node scripts/screenshots.mts ...
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const [outDir, email, ...routes] = process.argv.slice(2);
const base = process.env.SNAP_BASE ?? "http://localhost:3000";
const password = process.env.SNAP_PASSWORD ?? "Academy2026!";
const which = (process.env.SNAP_VIEWPORTS ?? "desktop,mobile").split(",");
const fullPage = process.env.SNAP_FULL !== "false";

const viewports = {
  desktop: { width: 1440, height: 900, isMobile: false },
  mobile: { width: 390, height: 844, isMobile: true },
} as const;

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ channel: process.env.SNAP_CHANNEL ?? "chrome" });

for (const name of which as (keyof typeof viewports)[]) {
  const vp = viewports[name];
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    isMobile: vp.isMobile,
    hasTouch: vp.isMobile,
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log(`[${name}] pageerror: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && console.log(`[${name}] console: ${m.text().slice(0, 200)}`));

  if (email && email !== "-") {
    await page.goto(`${base}/login`);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 });
  }

  for (const route of routes) {
    const res = await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const file = path.join(outDir, `${name}-${route.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "home"}.png`);
    await page.screenshot({ path: file, fullPage });
    console.log(`${name} ${route} -> ${res?.status()} ${page.url().replace(base, "")} ${file}`);
  }
  await context.close();
}
await browser.close();
