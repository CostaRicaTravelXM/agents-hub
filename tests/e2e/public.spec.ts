import { expect, test } from "@playwright/test";

test("landing page and protected routes", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Free Costa Rica masterclasses/ })).toBeVisible();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
});

test("unknown certificate codes are reported as not found", async ({ page }) => {
  await page.goto("/verify/TXM-2000-NOPE22");
  await expect(page.getByRole("heading", { name: "Certificate not found" })).toBeVisible();
});

test("private media is not reachable without a signed URL", async ({ request }) => {
  const res = await request.get("http://localhost:9000/academy-private/videos/demo/arenal.mp4");
  expect(res.status()).toBe(403);
});

test("progress API rejects anonymous heartbeats", async ({ request }) => {
  const res = await request.post("/api/progress", {
    data: { lessonId: "00000000-0000-0000-0000-000000000000", position: 1, watchPct: 100, delta: 10 },
  });
  expect([401, 403, 404]).toContain(res.status());
});

test("a signed-in session cannot change the password without the emailed link", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("agent@travelxm.test");
  await page.getByLabel("Password", { exact: true }).fill("Academy2026!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  await page.goto("/reset-password");
  await expect(page.getByLabel("New password")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Email me a reset link" })).toBeVisible();
  await page.goto("/profile");
  await expect(page.getByLabel("New password")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Email me a reset link" })).toBeVisible();
});
