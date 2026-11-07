import { expect, test } from "@playwright/test";
import { openBookAtPageOne, signIn } from "./helpers";

/** Runs on desktop and on a landscape iPad: two pages side by side. Needs the seeded book. */
test("the book reader shows a spread and turns pages with keys, buttons and the slider", async ({ page }) => {
  await signIn(page, "agent@travelxm.test");
  const total = await openBookAtPageOne(page);
  test.skip(total < 4, "The demo book needs at least four pages");
  await expect(page.getByRole("heading", { name: "Working with TravelXM" })).toBeVisible();

  // Both pages and the controls fit on the screen without scrolling.
  await expect(page.getByRole("img", { name: /page 1$/ })).toBeVisible();
  await expect(page.getByRole("img", { name: /page 2$/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next page" })).toBeInViewport({ ratio: 1 });
  const viewport = page.viewportSize()!;
  const pageTwo = (await page.getByRole("img", { name: /page 2$/ }).boundingBox())!;
  expect(pageTwo.x + pageTwo.width).toBeLessThanOrEqual(viewport.width);
  expect(pageTwo.y + pageTwo.height).toBeLessThanOrEqual(viewport.height);

  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByText(/^Pages 3–4 of/)).toBeVisible({ timeout: 5000 });
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByText(/^Pages 1–2 of/)).toBeVisible({ timeout: 5000 });
  await page.keyboard.press("End");
  await expect(page.getByText(new RegExp(`[–\\s]${total} of ${total}$`))).toBeVisible();
  await page.keyboard.press("Home");
  await expect(page.getByText(/^Pages 1–2 of/)).toBeVisible();

  // The slider changes the page when it is released.
  const slider = page.getByRole("slider", { name: "Go to page" });
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText(/^Pages 3–4 of/)).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText(/^Pages 5–6 of/)).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByText(/^Pages 3–4 of/)).toBeVisible();

  // The position survives a reload, on this device and on the server.
  await page.waitForTimeout(1800);
  await page.reload();
  await expect(page.getByText(/Continuing from page 3/)).toBeVisible();
  await expect(page.getByText(/^Pages 3–4 of/)).toBeVisible();

  // Reduced motion still turns pages.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Previous page" }).click();
  await expect(page.getByText(/^Pages 1–2 of/)).toBeVisible();

  await expect(page.getByRole("link", { name: /Download PDF/ })).toHaveAttribute("href", /mode=download/);
  await page.getByRole("button", { name: /Larger text/ }).click();
  await expect(page.getByText(/Larger text: scroll to read/)).toBeVisible();
});
