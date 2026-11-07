import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("mobile app shell: no top bar, five tabs, the More sheet and the course content sheet", async ({ page }) => {
  await signIn(page, "agent@travelxm.test");
  const tabs = page.getByRole("navigation", { name: "Main" });
  await expect(page.getByRole("banner")).toHaveCount(0);
  for (const label of ["Home", "Learning", "Trips", "Profile"]) {
    await expect(tabs.getByRole("link", { name: label })).toBeVisible();
  }
  const more = tabs.getByRole("button", { name: "More" });
  await expect(more).toBeVisible();
  for (const el of [more, tabs.getByRole("link", { name: "Home" })]) {
    const box = await el.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }

  await more.click();
  const sheet = page.getByRole("dialog", { name: "More" });
  await expect(sheet).toBeVisible();
  const books = sheet.getByRole("link", { name: /Books/ });
  const tile = await books.boundingBox();
  expect(tile?.height ?? 0).toBeGreaterThanOrEqual(44);
  await books.click();
  await expect(page).toHaveURL(/\/books/);
  await expect(sheet).toBeHidden();

  await tabs.getByRole("link", { name: "Learning" }).click();
  await expect(page.getByRole("heading", { name: "Learn Costa Rica" })).toBeVisible();
  await page.getByRole("navigation", { name: "Learning" }).getByRole("link", { name: "Progress" }).click();
  await expect(page.getByRole("heading", { name: "Progress", exact: true })).toBeVisible();

  await page.goto("/courses/costa-rica-specialist");
  await page.getByRole("link", { name: /Continue learning/ }).click();
  await page.getByRole("button", { name: "Course content" }).click();
  await expect(page.getByRole("dialog", { name: "Course content" })).toBeVisible();
});

test("mobile profile: the tab opens the profile and signing out is there", async ({ page }) => {
  await signIn(page, "agent@travelxm.test");
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Profile" }).click();
  await expect(page).toHaveURL(/\/profile/);
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
});

test("mobile FAM trip: the interest button is visible without scrolling", async ({ page }) => {
  await signIn(page, "agent@travelxm.test");
  await page.goto("/fam-trips/wellness");
  await expect(page.getByRole("link", { name: /Register interest/ }).first()).toBeInViewport();
});

// The live Zoho form, so this needs the internet. Every POST to Zoho is blocked: no lead is ever sent.
test("the interest form fits the screen and scrolls to Submit with a finger on small phones", async ({ page }) => {
  await page.context().route(/zoho/, (route) => (route.request().method() === "POST" ? route.abort() : route.continue()));
  await signIn(page, "agent@travelxm.test");
  const cdp = await page.context().newCDPSession(page);
  const swipe = async (x: number, from: number, to: number) => {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: from }] });
    for (let i = 1; i <= 12; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: from + ((to - from) * i) / 12 }] });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(350);
  };

  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 700 });
    await page.goto("/fam-trips/wellness/interest");
    const frame = page.locator("iframe");
    const submit = page.frameLocator("iframe").getByRole("button", { name: "Submit" });
    await expect(submit).toBeAttached({ timeout: 30_000 });
    const navTop = (await page.getByRole("navigation", { name: "Main" }).boundingBox())!.y;
    // Zoho under-reports the form's height, so a frame sized from it hid the end of the
    // form (Submit included) in a strip that only scrolled from inside the frame. On
    // phones the frame now fits the screen and the whole form scrolls inside it.
    const frameHeight = (await frame.boundingBox())!.height;
    expect(frameHeight, `frame fits the screen at ${width}px`).toBeLessThanOrEqual(navTop);

    let visible = false;
    for (let i = 0; i < 30 && !visible; i++) {
      const box = (await frame.boundingBox())!;
      const top = Math.max(box.y + 20, 40);
      const bottom = Math.min(box.y + box.height - 20, navTop - 20);
      // Start inside the form while it is on screen, like a finger would.
      if (bottom - top > 120) await swipe(width / 2, bottom, top);
      else await swipe(width / 2, navTop - 40, 60);
      const s = await submit.boundingBox();
      visible = Boolean(s && s.y >= 0 && s.y + s.height <= navTop);
    }
    expect(visible, `Submit reachable at ${width}px`).toBe(true);
  }
});
