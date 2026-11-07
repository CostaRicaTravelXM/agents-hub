import { expect, test } from "@playwright/test";
import { adminClient } from "./admin-client";
import { signIn } from "./helpers";

test("the lesson video takes the screen and the course content opens from a button", async ({ page }) => {
  await signIn(page, "agent@travelxm.test");
  await page.goto("/courses/costa-rica-specialist");
  const start = page.locator('a[href^="/learn/"]').first();
  await page.goto((await start.getAttribute("href"))!);

  // Closed on arrival, so nothing sits beside the video.
  const dialog = page.getByRole("dialog", { name: "Course content" });
  await expect(dialog).toHaveCount(0);

  const video = page.getByRole("region", { name: /Video player/ });
  await expect(video).toBeVisible();
  const box = (await video.boundingBox())!;
  const viewport = page.viewportSize()!;
  // Fills the width, or the height left under the top bar, whichever runs out first.
  const fullWidth = box.width >= viewport.width - 1;
  const fullHeight = Math.round(box.height) >= viewport.height - 64 - 1;
  expect(fullWidth || fullHeight).toBe(true);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);

  await page.getByRole("button", { name: "Course content" }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("link", { name: /How to book with TravelXM/ })).toBeVisible();

  // Choosing a lesson closes the panel and goes there.
  await dialog.getByRole("link", { name: /How to book with TravelXM/ }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1, name: "How to book with TravelXM" })).toBeVisible();
});

test("a course shows one main action at every size", async ({ page }) => {
  await signIn(page, "agent@travelxm.test");
  await page.goto("/courses/costa-rica-specialist");
  await expect(page.getByRole("heading", { level: 1, name: "Costa Rica Specialist" })).toBeVisible();
  const main = page.locator('main a[href^="/learn/"]').filter({ hasText: /Continue|Start|Review/ });
  await expect(main.locator("visible=true")).toHaveCount(1);
});

test("a lesson with a video link plays in the same big frame and is completed by hand", async ({ page }) => {
  const db = adminClient();
  const slug = `e2e-embed-${Date.now()}`;
  const { data: course, error } = await db.from("courses").insert({ slug, title: "E2E embed course", status: "published" }).select("id").single();
  expect(error).toBeNull();
  try {
    const { data: mod } = await db.from("modules").insert({ course_id: course!.id, title: "Module", sort_order: 0 }).select("id").single();
    const { data: lesson } = await db
      .from("lessons")
      .insert({ course_id: course!.id, module_id: mod!.id, title: "Embedded talk", type: "video", sort_order: 0, external_url: "https://fast.wistia.net/embed/iframe/e2e" })
      .select("id")
      .single();

    await signIn(page, "agent@travelxm.test");
    await page.goto(`/learn/${slug}/${lesson!.id}`);
    await expect(page.getByTitle("Embedded talk")).toHaveAttribute("src", /wistia/);
    await page.getByRole("button", { name: /Mark as complete/ }).click();
    await expect(page.locator("main").getByText("Lesson complete")).toBeVisible();
  } finally {
    await db.from("courses").delete().eq("id", course!.id);
  }
});
