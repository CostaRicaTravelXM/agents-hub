import { expect, type Page } from "@playwright/test";

export const PASSWORD = "Academy2026!";

export async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

export async function register(page: Page, opts: { name: string; email: string; company?: string; next?: string }) {
  await page.goto(`/register${opts.next ? `?next=${encodeURIComponent(opts.next)}` : ""}`);
  await page.getByLabel("Full name").fill(opts.name);
  await page.getByLabel("Agency or company").fill(opts.company ?? "E2E Travel Co.");
  await page.getByLabel("Country").selectOption("United States");
  await page.getByLabel("Work email").fill(opts.email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/register"));
}

export function uniqueEmail(prefix: string) {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e4)}@e2e.test`;
}

/** Plays the lesson video at 16x until the player reports completion. */
export async function watchVideo(page: Page) {
  await page.getByRole("button", { name: /^Play/ }).first().click();
  await page.evaluate(() => {
    const v = document.querySelector("video")!;
    v.muted = true;
    v.playbackRate = 16;
  });
  await expect(page.getByText("Lesson complete").first()).toBeVisible({ timeout: 30_000 });
}

export async function markComplete(page: Page) {
  await page.getByRole("button", { name: "Mark as complete" }).click();
  await expect(page.getByText("Lesson complete").first()).toBeVisible();
}
