import { expect, test, type Page } from "@playwright/test";
import { adminClient } from "./admin-client";
import { confirmEmail, MAILPIT } from "./helpers";

/**
 * The Thanksgiving gift page, signed out, with Zoho not connected (the local
 * default): every advisor is "new" and the claim waits in the database.
 */
const admin = adminClient();
const email = `gift-e2e-${Date.now()}@travelxm.test`;

async function claimButton(page: Page) {
  const button = page.getByRole("button", { name: "Claim your gift" });
  // Disabled while the opening clip plays (4.7 s), then the loop takes over.
  await expect(button).toBeEnabled({ timeout: 20_000 });
  return button;
}

test.afterAll(async () => {
  await admin.from("hub_campaign_claims").delete().eq("email", email);
  // The invite link created a Hub account for this address.
  const { data: profile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (profile) await admin.auth.admin.deleteUser(profile.id);
});

/** How far the gift frame falls short of each screen edge, in pixels (0 or less means it covers that edge). */
async function giftGaps(page: Page) {
  return page.locator("[data-gift]").evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, right: window.innerWidth - r.right, bottom: window.innerHeight - r.bottom };
  });
}

for (const size of [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 844, height: 390 },
]) {
  test(`the gift frame covers a ${size.width}x${size.height} screen and the button stays on it`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto("/thanksgiving");
    const gaps = await giftGaps(page);
    for (const gap of Object.values(gaps)) expect(gap).toBeLessThan(1);
    // Centred: the same amount is cropped on both sides, and on top and bottom.
    expect(Math.abs(gaps.left - gaps.right)).toBeLessThan(1);
    expect(Math.abs(gaps.top - gaps.bottom)).toBeLessThan(1);
    const box = (await (await claimButton(page)).boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(size.width);
    expect(box.y + box.height).toBeLessThanOrEqual(size.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth && document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
  });
}

test("the gift page is public and shows the two video layers", async ({ page }) => {
  await page.goto("/thanksgiving?ch=email");
  await expect(page).toHaveURL(/\/thanksgiving\?ch=email$/);
  await expect(page.getByRole("heading", { level: 1, name: "Happy Thanksgiving from TravelXM" })).toBeAttached();

  const background = page.locator('video[src^="/thanksgiving/bg-"]');
  await expect(background).toHaveCount(1);
  await expect.poll(() => background.evaluate((v: HTMLVideoElement) => !v.paused && v.currentTime > 0)).toBe(true);

  await claimButton(page);
  const loop = page.locator('video[src^="/thanksgiving/loop-"]');
  await expect.poll(() => loop.evaluate((v: HTMLVideoElement) => !v.paused && v.loop)).toBe(true);
  await expect(loop).toBeVisible();
  // Nothing scrolls sideways or down: it is one screen.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("the canvas path used on iPhone draws the gift with a transparent background", async ({ page }) => {
  await page.goto("/thanksgiving?alpha=canvas");
  await claimButton(page);
  await expect(page.locator('video[src$="-stacked.mp4"]')).toHaveCount(2);
  const corner = await page.locator("canvas").evaluate((canvas: HTMLCanvasElement) => {
    const sample = () => {
      const copy = document.createElement("canvas");
      copy.width = canvas.width;
      copy.height = canvas.height;
      const ctx = copy.getContext("2d")!;
      ctx.drawImage(canvas, 0, 0);
      const px = (x: number, y: number) => ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data[3];
      // Top-left corner is empty; the middle of the box is solid.
      return { corner: px(4, 4), box: px(canvas.width / 2, canvas.height * 0.55) };
    };
    // A WebGL canvas is only readable in the frame it was drawn in, so read right after the page's own draw.
    return new Promise<{ corner: number; box: number }>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(sample()))));
  });
  expect(corner.corner).toBe(0);
  expect(corner.box).toBeGreaterThan(200);
});

test("reduced motion gets a still gift and a working button", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/thanksgiving");
  await expect(page.getByRole("button", { name: "Claim your gift" })).toBeEnabled();
  await expect(page.locator("video")).toHaveCount(0);
  await expect(page.locator('img[src*="/thanksgiving/still-"]')).toBeVisible();
  await context.close();
});

test("the kit is locked until a claim is confirmed", async ({ request }) => {
  const res = await request.get("/api/thanksgiving/kit", { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  expect(res.headers().location).toMatch(/\/thanksgiving$/);
});

test("a new advisor enters four fields, gets the kit, and the claim is stored with its channel", async ({ page }) => {
  await page.goto("/thanksgiving?ch=whatsapp");
  await (await claimButton(page)).click();

  await page.getByLabel("Email").fill("not-an-email");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("alert").first()).toContainText("valid email");

  await page.getByLabel("Email").fill(email.toUpperCase());
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Tell us who the gift is for" })).toBeVisible();

  // Looking the email up is not enough to reach the file.
  const locked = await page.request.get("/api/thanksgiving/kit", { maxRedirects: 0 });
  expect(locked.headers().location).toMatch(/\/thanksgiving$/);

  await page.getByRole("button", { name: "Open my gift" }).click();
  await expect(page.getByText("Enter your first name")).toBeVisible();

  await page.getByLabel("First name").fill("Gia");
  await page.getByLabel("Last name").fill("Gift");
  await page.getByLabel("Agency or company").fill("Sunset Travel");
  await page.getByLabel("Phone").fill("+1 305 555 0100");
  await page.getByRole("button", { name: "Open my gift" }).click();

  await expect(page.getByRole("heading", { name: "Your gift is ready" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Download the Selling Kit/ })).toHaveAttribute("href", "/api/thanksgiving/kit?mode=download");
  // The Hub invite is on its way to the address they typed, and nobody is signed in yet.
  await expect(page.getByRole("heading", { name: "Your Agents Hub is ready" })).toBeVisible();
  await expect(page.getByText("We also sent your Agents Hub access to")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send it again" })).toBeVisible();

  // The download is a short-lived signed link to the real PDF.
  const kit = await page.request.get("/api/thanksgiving/kit?mode=download", { maxRedirects: 0 });
  expect(kit.status()).toBe(307);
  const signed = kit.headers().location;
  expect(signed).toContain("costa-rica-selling-kit.pdf");
  const file = await page.request.get(signed);
  expect(file.status()).toBe(200);
  expect((await file.body()).subarray(0, 5).toString()).toBe("%PDF-");

  await expect
    .poll(async () => (await admin.from("hub_campaign_claims").select("*").eq("email", email).single()).data?.kit_downloaded_at ?? null)
    .not.toBeNull();
  const { data: claim } = await admin.from("hub_campaign_claims").select("*").eq("email", email).single();
  expect(claim).toMatchObject({
    campaign: "thanksgiving-2026",
    channel: "whatsapp",
    known: false,
    first_name: "Gia",
    last_name: "Gift",
    company: "Sunset Travel",
    phone: "+1 305 555 0100",
    is_independent: false,
    // Zoho is not connected locally, so the claim is waiting to be sent.
    synced_version: 0,
    zoho_record_id: null,
  });
  expect(claim!.confirmed_at).not.toBeNull();
  expect(claim!.version).toBeGreaterThan(0);

  // Creating a Hub account afterwards starts with what they already typed.
  await page.goto("/register");
  await expect(page.getByLabel("Email")).toHaveValue(email);
  await expect(page.getByLabel("First name")).toHaveValue("Gia");
  await expect(page.getByLabel("Agency or company")).toHaveValue("Sunset Travel");
  await page.goto("/thanksgiving?ch=whatsapp");

  // Coming back on the same device goes straight to the gift.
  await page.reload();
  await (await claimButton(page)).click();
  await expect(page.getByRole("heading", { name: "Your gift is ready" })).toBeVisible();
  await expect(page.getByText("We also sent your Agents Hub access to")).toBeVisible();

  // Until the link is opened there is no account to get into.
  await page.goto("/fam-trips");
  await expect(page).toHaveURL(/\/login/);

  // Opening the emailed link creates the account, signed in, with the profile already filled.
  await confirmEmail(page, email);
  await page.waitForURL((u) => !u.pathname.startsWith("/auth") && !u.pathname.startsWith("/login") && !u.pathname.startsWith("/welcome"));
  const { data: profile } = await admin.from("profiles").select("first_name, last_name, company, is_independent, hub_onboarded_at").eq("email", email).single();
  expect(profile).toMatchObject({ first_name: "Gia", last_name: "Gift", company: "Sunset Travel", is_independent: false });
  expect(profile!.hub_onboarded_at).not.toBeNull();
  const { data: invited } = await admin.from("hub_campaign_claims").select("hub_invited_at, hub_invite_error").eq("email", email).single();
  expect(invited!.hub_invited_at).not.toBeNull();
  expect(invited!.hub_invite_error).toBeNull();

  // The invite email has the gift wording and a way back to the kit.
  const { messages } = (await (await fetch(`${MAILPIT}/search?query=${encodeURIComponent(`to:"${email}"`)}`)).json()) as { messages: { ID: string }[] };
  const mail = (await (await fetch(`${MAILPIT}/message/${messages[0].ID}`)).json()) as { HTML: string };
  expect(mail.HTML).toContain("Your gift is claimed");
  expect(mail.HTML).toMatch(/href="[^"]*\/thanksgiving"[^>]*>Download your Selling Kit/);

  // Hub Home shows the way back to the gift, and it opens without asking again on this device.
  await page.goto("/dashboard");
  const tile = page.getByRole("link", { name: /Your Thanksgiving gift/ });
  await expect(tile).toBeVisible();
  await expect(tile).toHaveAttribute("href", "/thanksgiving");

  // With an account, the gift screen points to sign-in instead of sending more email.
  await page.goto("/thanksgiving");
  await (await claimButton(page)).click();
  await expect(page.getByText("You already have an Agents Hub account.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in to the Agents Hub" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send it again" })).toHaveCount(0);
});

test("someone else typing a confirmed email sees masked details and gets nothing until they confirm", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/thanksgiving");
  await (await claimButton(page)).click();
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Is this you?" })).toBeVisible();
  await expect(page.getByText("G••• G•••")).toBeVisible();
  await expect(page.getByText("Sun••• Tra•••")).toBeVisible();
  await expect(page.getByText("Gia")).toHaveCount(0);
  await expect(page.getByText("Sunset Travel")).toHaveCount(0);
  const locked = await page.request.get("/api/thanksgiving/kit", { maxRedirects: 0 });
  expect(locked.headers().location).toMatch(/\/thanksgiving$/);

  await page.getByRole("button", { name: "Not you? Use another email" }).click();
  await expect(page.getByLabel("Email")).toBeVisible();
  await context.close();
});

test("an advisor who already has a Hub account gets a sign-in email with the gift wording", async ({ browser }) => {
  // Supabase sends one email a minute to the same address; the invite above was the last one.
  const { data: before } = await admin.from("hub_campaign_claims").select("hub_invited_at").eq("email", email).single();
  const wait = 62_000 - (Date.now() - new Date(before!.hub_invited_at!).getTime());
  const context = await browser.newContext();
  const page = await context.newPage();
  if (wait > 0) await page.waitForTimeout(wait);

  await page.goto("/thanksgiving");
  await (await claimButton(page)).click();
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Yes, open my gift" }).click();
  await expect(page.getByText("We emailed a one-tap sign-in link to")).toBeVisible();

  await expect
    .poll(async () => (await admin.from("hub_campaign_claims").select("hub_member_emailed_at").eq("email", email).single()).data?.hub_member_emailed_at ?? null)
    .not.toBeNull();
  const { messages } = (await (await fetch(`${MAILPIT}/search?query=${encodeURIComponent(`to:"${email}"`)}`)).json()) as { messages: { ID: string }[] };
  expect(messages.length).toBe(2);
  const mail = (await (await fetch(`${MAILPIT}/message/${messages[0].ID}`)).json()) as { HTML: string };
  expect(mail.HTML).toContain("Your Agents Hub is waiting");
  expect(mail.HTML).toMatch(/href="[^"]*\/thanksgiving"[^>]*>Download your Selling Kit/);

  // The mark that gave this email its wording is gone, so later sign-in emails are plain.
  const { data: profile } = await admin.from("profiles").select("id").eq("email", email).single();
  await expect.poll(async () => (await admin.auth.admin.getUserById(profile!.id)).data.user?.user_metadata?.gift_email ?? null).toBeNull();

  // The link signs them in.
  const href = /href="([^"]*token_hash[^"]*)"/.exec(mail.HTML)![1];
  await page.goto(href.replaceAll("&amp;", "&"));
  await page.waitForURL((u) => !u.pathname.startsWith("/auth") && !u.pathname.startsWith("/login"));
  await expect(page.getByRole("link", { name: /Your Thanksgiving gift/ })).toBeVisible();
  await context.close();
});
