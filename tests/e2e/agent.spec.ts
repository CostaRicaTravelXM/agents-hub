import { expect, test, type Page } from "@playwright/test";
import { courses } from "../../scripts/seed-content.mts";
import { adminClient } from "./admin-client";
import { markComplete, register, signIn, uniqueEmail, watchVideo } from "./helpers";

// The seeded catalog: the real masterclasses, plus a partner-only one and a draft.
const open = courses.filter((c) => c.visibility !== "groups" && c.status !== "draft");
const partner = courses.find((c) => c.visibility === "groups")!;
const draft = courses.find((c) => c.status === "draft")!;
const quizOf = (c: (typeof courses)[number]) => c.modules[0].lessons.find((l) => l.type === "quiz")!.quiz!;

/** Answer options are labelled "A …", "B …"; pick the one whose text is exactly this. */
const option = (page: Page, text: string) => page.getByRole("radio").filter({ has: page.getByText(text, { exact: true }) });

test.describe("travel agent journey", () => {
  test("register, see public masterclasses only, join a group by invite link", async ({ page }) => {
    const email = uniqueEmail("agent");
    await register(page, { name: "Erin Test", email, next: "/join/PARTNER27" });

    // Back on the invite page after registering.
    await expect(page).toHaveURL(/\/join\/PARTNER27/);
    await expect(page.getByRole("heading", { name: "Partner Agencies 2027" })).toBeVisible();

    await page.goto("/courses");
    await expect(page.getByRole("heading", { name: open[0].title })).toBeVisible();
    await expect(page.getByRole("heading", { name: partner.title })).toHaveCount(0);
    // Drafts are never listed.
    await expect(page.getByRole("heading", { name: draft.title })).toHaveCount(0);

    await page.goto("/join/PARTNER27");
    await page.getByRole("button", { name: "Join group" }).click();
    await expect(page.getByText("You are in")).toBeVisible();

    await page.goto("/courses");
    await expect(page.getByRole("heading", { name: partner.title })).toBeVisible();
  });

  test("modules unlock in order", async ({ page }) => {
    // Masterclasses have one module, so this builds its own two-module course.
    const db = adminClient();
    const slug = `e2e-locks-${Date.now()}`;
    const { data: course, error } = await db.from("courses").insert({ slug, title: "E2E locked modules", status: "published" }).select("id").single();
    expect(error).toBeNull();
    try {
      const { data: mods } = await db
        .from("modules")
        .insert([
          { course_id: course!.id, title: "First steps", sort_order: 0 },
          { course_id: course!.id, title: "Next steps", sort_order: 1 },
        ])
        .select("id, sort_order");
      const [first, second] = [...mods!].sort((a, b) => a.sort_order - b.sort_order);
      await db.from("module_requirements").insert({ module_id: second.id, required_module_id: first.id });
      await db.from("lessons").insert([
        { course_id: course!.id, module_id: first.id, title: "Read this first", type: "reading", sort_order: 0 },
        { course_id: course!.id, module_id: second.id, title: "Read this next", type: "reading", sort_order: 0 },
      ]);

      await register(page, { name: "Lock Tester", email: uniqueEmail("lock") });
      await page.goto(`/courses/${slug}`);
      await expect(page.getByText("Complete First steps to unlock this module.")).toBeVisible();
      const locked = await page.getByText("Read this next").locator("xpath=ancestor::*[@aria-disabled='true'][1]").count();
      expect(locked).toBe(1);

      await page.getByRole("link", { name: /Start course/ }).click();
      await markComplete(page);

      await page.goto(`/courses/${slug}`);
      await expect(page.getByText("Complete First steps to unlock this module.")).toHaveCount(0);
      await expect(page.getByText("1 of 2 lessons done")).toBeVisible();
    } finally {
      await db.from("courses").delete().eq("id", course!.id);
    }
  });

  test("watch a masterclass, pass its quiz and receive a verifiable certificate", async ({ page }) => {
    const name = "Quinn Certified";
    const course = open[0];
    const quiz = quizOf(course);
    await register(page, { name, email: uniqueEmail("cert") });
    await page.goto(`/courses/${course.slug}`);
    await page.getByRole("link", { name: /Start course/ }).click();
    await expect(page.getByText(/watch 90% to complete/)).toBeVisible();
    await watchVideo(page);

    await page.getByRole("link", { name: /Quiz/ }).first().click();
    await page.getByRole("button", { name: /Start quiz/ }).click();
    for (const [i, q] of quiz.questions.entries()) {
      await option(page, q.options[q.correct[0]]).click();
      await page.getByRole("button", { name: i === quiz.questions.length - 1 ? "Submit answers" : "Next", exact: true }).click();
    }
    await expect(page.getByText("100%").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Well done" })).toBeVisible();

    await page.goto("/certificates");
    await expect(page.getByRole("heading", { name: course.title })).toBeVisible();
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
    const course = open[0];
    const quiz = quizOf(course);
    await register(page, { name: "Fay Retry", email: uniqueEmail("retry") });
    await page.goto(`/courses/${course.slug}`);
    await page.getByRole("link", { name: /Quiz/ }).first().click();
    await page.getByRole("button", { name: /Start quiz/ }).click();
    for (const [i, q] of quiz.questions.entries()) {
      const wrong = q.options.findIndex((_, oi) => !q.correct.includes(oi));
      await option(page, q.options[wrong]).click();
      await page.getByRole("button", { name: i === quiz.questions.length - 1 ? "Submit answers" : "Next", exact: true }).click();
    }
    await expect(page.getByText("Not passed yet")).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  });

  test("resources download through a signed link", async ({ page }) => {
    await signIn(page, "agent@travelxm.test");
    await page.goto("/resources");
    const link = page.getByRole("link", { name: /TravelXM advisor handbook/ }).first();
    const href = await link.getAttribute("href");
    const res = await page.request.get(href!, { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(res.headers()["location"]).toMatch(/X-Amz-Signature=/);
  });
});
