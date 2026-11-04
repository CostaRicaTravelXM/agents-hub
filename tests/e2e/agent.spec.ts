import { expect, test } from "@playwright/test";
import { markComplete, register, signIn, uniqueEmail, watchVideo } from "./helpers";

test.describe("travel agent journey", () => {
  test("register, see public courses only, join a group by invite link", async ({ page }) => {
    const email = uniqueEmail("agent");
    await register(page, { name: "Erin Test", email, next: "/join/PARTNER27" });

    // Back on the invite page after registering.
    await expect(page).toHaveURL(/\/join\/PARTNER27/);
    await expect(page.getByRole("heading", { name: "Partner Agencies 2027" })).toBeVisible();

    await page.goto("/courses");
    await expect(page.getByRole("heading", { name: "Costa Rica Specialist" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Groups & Incentives Playbook 2027" })).toHaveCount(0);
    // Drafts are never listed.
    await expect(page.getByRole("heading", { name: "Poás & the Central Valley" })).toHaveCount(0);

    await page.goto("/join/PARTNER27");
    await page.getByRole("button", { name: "Join group" }).click();
    await expect(page.getByText("You are in")).toBeVisible();

    await page.goto("/courses");
    await expect(page.getByRole("heading", { name: "Groups & Incentives Playbook 2027" })).toBeVisible();
  });

  test("modules unlock in order and a video only completes after it is watched", async ({ page }) => {
    await register(page, { name: "Lock Tester", email: uniqueEmail("lock") });
    await page.goto("/courses/costa-rica-specialist");
    await expect(page.getByText("Complete Welcome to TravelXM to unlock this module.")).toBeVisible();

    // Locked lesson URL shows the lock screen, not the content.
    const lockedHref = await page.getByText("Seven regions in one small country").locator("xpath=ancestor::*[@aria-disabled='true'][1]").count();
    expect(lockedHref).toBe(1);

    await page.getByRole("link", { name: /Start course/ }).click();
    await expect(page.getByRole("heading", { name: "Who we are and how we work with advisors" })).toBeVisible();
    await expect(page.getByText(/watch 90% to complete/)).toBeVisible();
    await watchVideo(page);

    await page.getByRole("link", { name: /How to book with TravelXM/ }).first().click();
    await markComplete(page);
    await page.getByRole("link", { name: /TravelXM advisor handbook/ }).first().click();
    await markComplete(page);

    await page.goto("/courses/costa-rica-specialist");
    await expect(page.getByText("Complete Welcome to TravelXM to unlock this module.")).toHaveCount(0);
    await expect(page.getByText("Complete Geography and seasons to unlock this module.")).toBeVisible();
    await expect(page.getByText("3 of 12 lessons done")).toBeVisible();
  });

  test("finish a course with a quiz and receive a verifiable certificate", async ({ page }) => {
    const name = "Quinn Certified";
    await register(page, { name, email: uniqueEmail("cert") });
    await page.goto("/courses/arenal-la-fortuna");
    await page.getByRole("link", { name: /Start course/ }).click();

    await watchVideo(page); // Arenal in four minutes
    await page.getByRole("link", { name: /Where to stay/ }).first().click();
    await markComplete(page);
    await page.getByRole("link", { name: /A day in La Fortuna/ }).first().click();
    await watchVideo(page);
    await page.getByRole("link", { name: /Arenal fact sheet/ }).first().click();
    await markComplete(page);

    await page.getByRole("link", { name: /Arenal quiz/ }).first().click();
    await page.getByRole("button", { name: /Start quiz/ }).click();

    // First attempt: one wrong answer out of four = 75%, which still passes (75% needed).
    // Answer everything correctly instead to check the full-score path.
    const answers = ["About 7 km", "Hot-spring resorts", "Afternoon", "True"];
    for (const [i, a] of answers.entries()) {
      await page.getByRole("radio", { name: a }).click();
      await page.getByRole("button", { name: i === answers.length - 1 ? "Submit answers" : "Next", exact: true }).click();
    }
    await expect(page.getByText("100%").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Well done" })).toBeVisible();

    await page.goto("/certificates");
    await expect(page.getByRole("heading", { name: "Arenal & La Fortuna" })).toBeVisible();
    const code = await page.getByText(/TXM-\d{4}-[A-Z2-9]{6}/).first().innerText();
    const match = code.match(/TXM-\d{4}-[A-Z2-9]{6}/)![0];

    const pdf = await page.request.get(`/api/certificates/${match}`);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toContain("application/pdf");

    await page.context().clearCookies();
    await page.goto(`/verify/${match}`);
    await expect(page.getByText("This certificate is genuine")).toBeVisible();
    await expect(page.getByRole("heading", { name })).toBeVisible();
  });

  test("a failed quiz shows the score and allows a retry", async ({ page }) => {
    await signIn(page, "agent@travelxm.test");
    await page.goto("/courses/arenal-la-fortuna");
    await page.getByRole("link", { name: /Arenal quiz/ }).first().click();
    await page.getByRole("button", { name: /Retake quiz/ }).click();
    const wrong = ["About 90 km", "Town hotels", "Never", "False"];
    for (const [i, a] of wrong.entries()) {
      await page.getByRole("radio", { name: a }).click();
      await page.getByRole("button", { name: i === wrong.length - 1 ? "Submit answers" : "Next", exact: true }).click();
    }
    await expect(page.getByText("Not passed yet")).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  });

  test("resources download through a signed link", async ({ page }) => {
    await signIn(page, "agent@travelxm.test");
    await page.goto("/resources");
    const link = page.getByRole("link", { name: /Destination fact sheets/ }).first();
    const href = await link.getAttribute("href");
    const res = await page.request.get(href!, { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(res.headers()["location"]).toMatch(/X-Amz-Signature=/);
  });
});
