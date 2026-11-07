import { expect, type Page } from "@playwright/test";

export const PASSWORD = "Academy2026!";

export async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

/** The reader resumes where the shared demo account left off, so a test starts by going to page 1. */
export async function openBookAtPageOne(page: Page) {
  await page.goto("/books");
  await page.getByRole("link", { name: /Working with TravelXM/ }).click();
  await expect(page).toHaveURL(/\/read\/working-with-travelxm/);
  const label = page.getByText(/^Pages? 1(–2)? of \d+/);
  await expect(async () => {
    await page.keyboard.press("Home");
    await expect(label).toBeVisible({ timeout: 800 });
  }).toPass({ timeout: 15_000 });
  // The Home key is saved a moment later; wait so the next reload starts clean.
  await page.waitForTimeout(1800);
  return Number((await label.textContent())!.match(/of (\d+)/)![1]);
}

const MAILPIT = "http://127.0.0.1:54324/api/v1";

/** Reads the confirmation link Supabase sent to Mailpit and opens it. */
async function confirmEmail(page: Page, email: string) {
  await expect
    .poll(
      async () => {
        const res = await fetch(`${MAILPIT}/search?query=${encodeURIComponent(`to:"${email}"`)}`);
        const { messages } = (await res.json()) as { messages: { ID: string }[] };
        return messages[0]?.ID ?? null;
      },
      { timeout: 15_000 },
    )
    .not.toBeNull();
  const res = await fetch(`${MAILPIT}/search?query=${encodeURIComponent(`to:"${email}"`)}`);
  const { messages } = (await res.json()) as { messages: { ID: string }[] };
  const message = (await (await fetch(`${MAILPIT}/message/${messages[0].ID}`)).json()) as { HTML: string };
  const href = /href="([^"]*token_hash[^"]*)"/.exec(message.HTML)?.[1];
  if (!href) throw new Error(`No confirmation link in the email to ${email}`);
  await page.goto(href.replaceAll("&amp;", "&"));
}

export async function register(page: Page, opts: { name: string; email: string; next?: string }) {
  const [firstName, ...rest] = opts.name.split(" ");
  await page.goto(`/register${opts.next ? `?next=${encodeURIComponent(opts.next)}` : ""}`);
  await page.getByLabel("First name").fill(firstName);
  await page.getByLabel("Last name").fill(rest.join(" ") || "Tester");
  await page.getByLabel("Email").fill(opts.email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Check your inbox")).toBeVisible();
  await confirmEmail(page, opts.email);
  await page.waitForURL((u) => !u.pathname.startsWith("/auth") && !u.pathname.startsWith("/register"));
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
  // Inside the page: a notification from the previous lesson can still be on screen.
  await expect(page.locator("main").getByText("Lesson complete").first()).toBeVisible({ timeout: 30_000 });
}

export async function markComplete(page: Page) {
  await page.getByRole("button", { name: "Mark as complete" }).click();
  await expect(page.locator("main").getByText("Lesson complete").first()).toBeVisible();
}
