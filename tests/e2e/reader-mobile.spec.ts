import { expect, test, type Page } from "@playwright/test";
import { openBookAtPageOne, signIn } from "./helpers";

/** A real touch swipe through the browser's input pipeline, so `touch-action` applies. */
async function swipe(page: Page, fromX: number, toX: number, y: number) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: fromX, y }] });
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: fromX + ((toX - fromX) * i) / steps, y }] });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

/** Phone and portrait tablet: one page at a time, swipe or buttons. Needs the seeded book. */
test("the book reader on a small screen: one page, swipe, buttons and Go to page", async ({ page }) => {
  await signIn(page, "agent@travelxm.test");
  const total = await openBookAtPageOne(page);
  test.skip(total < 2, "The magazine has a single page");

  // One whole page, never cut at the edge, and the controls on screen.
  await expect(page.getByRole("img", { name: /page 1$/ })).toBeVisible();
  await expect(page.getByRole("img", { name: /page 2$/ })).toHaveCount(0);
  const viewport = page.viewportSize()!;
  const image = (await page.getByRole("img", { name: /page 1$/ }).boundingBox())!;
  expect(image.x).toBeGreaterThanOrEqual(0);
  expect(image.x + image.width).toBeLessThanOrEqual(viewport.width);
  await expect(page.getByRole("button", { name: "Next page" })).toBeInViewport({ ratio: 1 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const box = (await page.locator(".xm-book-stage").boundingBox())!;
  const y = box.y + box.height / 2;

  // Swipe right to left: next page.
  await swipe(page, box.x + box.width * 0.85, box.x + box.width * 0.15, y);
  await expect(page.getByText(/^Page 2 of/)).toBeVisible({ timeout: 5000 });

  // A short, slow drag with the mouse snaps back.
  await page.mouse.move(box.x + box.width * 0.8, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.72, y, { steps: 4 });
  await page.waitForTimeout(400);
  await page.mouse.up();
  await page.waitForTimeout(600);
  await expect(page.getByText(/^Page 2 of/)).toBeVisible();

  // Swipe left to right: back a page.
  await swipe(page, box.x + box.width * 0.15, box.x + box.width * 0.85, y);
  await expect(page.getByText(/^Page 1 of/)).toBeVisible({ timeout: 5000 });

  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByText(/^Page 2 of/)).toBeVisible({ timeout: 5000 });
  await page.getByRole("button", { name: "Previous page" }).click();
  await expect(page.getByText(/^Page 1 of/)).toBeVisible({ timeout: 5000 });

  await page.getByRole("button", { name: /Go to a page/ }).click();
  await page.getByLabel("Page number").fill("2");
  await page.getByRole("button", { name: "Go", exact: true }).click();
  await expect(page.getByText(/^Page 2 of/)).toBeVisible();

  for (const name of ["Previous page", "Next page"]) {
    const b = await page.getByRole("button", { name }).boundingBox();
    expect(b?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
});
