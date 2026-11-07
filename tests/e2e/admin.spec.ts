import path from "node:path";
import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("admin CMS", () => {
  test("agents cannot open the admin portal", async ({ page }) => {
    await signIn(page, "agent@travelxm.test");
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("build a course, restrict it to a group, and check who sees it", async ({ page, browser }) => {
    const title = `E2E Honeymoons ${Date.now()}`;
    await signIn(page, "admin@travelxm.test");

    // Create the course with an uploaded cover photo.
    await page.goto("/admin/courses/new");
    await page.getByLabel("Title", { exact: true }).fill(title);
    await page.getByLabel("Description").fill("Three romantic routes in 10 days.");
    await page.locator('input[type="file"]').setInputFiles(path.join(process.cwd(), "public/photos/guanacaste-playa-hermosa-atardecer.jpg"));
    await expect(page.getByRole("button", { name: "Replace" })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Create course" }).click();
    await page.waitForURL(/\/admin\/courses\/[0-9a-f-]{36}/);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    const courseUrl = page.url();

    // Structure: one module, one reading lesson with content.
    await page.getByRole("link", { name: "Modules & lessons" }).click();
    await page.getByLabel("New module title").fill("Planning the trip");
    await page.getByRole("button", { name: "Add module" }).click();
    await expect(page.getByText("Module added")).toBeVisible();
    await page.getByLabel("Lesson type").selectOption("reading");
    await page.getByLabel("Lesson title").fill("Choosing the right beach");
    await page.getByRole("button", { name: "Add lesson" }).click();
    await expect(page.getByRole("heading", { name: "Choosing the right beach" })).toBeVisible();
    await page.getByRole("textbox", { name: "Lesson content" }).click();
    await page.keyboard.type("Guanacaste has the most sunshine from December to April.");
    await page.getByRole("button", { name: "Save lesson" }).click();
    await expect(page.getByText("Lesson saved")).toBeVisible();

    // Access: publish to the partner group only.
    await page.goto(`${courseUrl.split("?")[0]}?tab=access`);
    await page.getByText("Published", { exact: true }).click();
    await page.getByText("Selected groups only").click();
    await page.getByRole("checkbox").first().check();
    await page.getByRole("button", { name: "Save access" }).click();
    await expect(page.getByText("Course published")).toBeVisible();

    // A partner-group member (seeded) sees it; a regular agent does not.
    const member = await browser.newContext();
    const mp = await member.newPage();
    await signIn(mp, "james.carter@example.com");
    await mp.goto("/courses");
    await expect(mp.getByRole("heading", { name: title })).toBeVisible();
    await member.close();

    const outsider = await browser.newContext();
    const op = await outsider.newPage();
    await signIn(op, "agent@travelxm.test");
    await op.goto("/courses");
    await expect(op.getByRole("heading", { name: "Costa Rica Specialist" })).toBeVisible();
    await expect(op.getByRole("heading", { name: title })).toHaveCount(0);
    await outsider.close();
  });

  test("analytics and exports load for staff", async ({ page }) => {
    await signIn(page, "content@travelxm.test");
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Learning overview" })).toBeVisible();
    await expect(page.getByText("Registered agents")).toBeVisible();
    await expect(page.getByText("Certified agents")).toBeVisible();
    const csv = await page.request.get("/api/admin/export?type=agents");
    expect(csv.status()).toBe(200);
    expect(await csv.text()).toContain("email");
  });
});
