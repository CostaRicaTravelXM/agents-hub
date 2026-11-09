import { writeFileSync, unlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { expect, test } from "@playwright/test";
import { adminClient, storageClient } from "./admin-client";
import { signIn } from "./helpers";

/**
 * A group-only trip with no dates yet and an itinerary PDF. The seeded "Partner
 * Agencies 2027" group has James Carter but not Emily Nguyen, so Emily sees the
 * trip and its PDF but no form, and James gets the form.
 */
test("a group-only trip: every agent reads it, only the group applies", async ({ browser }) => {
  const db = adminClient();
  const { client, buckets } = storageClient();
  const title = `E2E group trip ${Date.now()}`;
  const pdf = path.join(os.tmpdir(), `e2e-itinerary-${Date.now()}.pdf`);
  writeFileSync(pdf, "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

  try {
    // Admin: no dates, the itinerary PDF, reserved for one group.
    const admin = await browser.newPage();
    await signIn(admin, "admin@travelxm.test");
    await admin.goto("/admin/fam-trips/new");
    await admin.getByLabel("Title").fill(title);
    await admin.getByLabel("Summary").fill("A test departure for one partner agency.");
    await admin.getByLabel("Interest form link").fill("https://example.com/fam-form");
    const uploaded = admin.waitForResponse((r) => r.url().endsWith("/api/admin/upload") && r.request().method() === "POST");
    await admin.locator('input[type="file"][accept*="application/pdf"]').setInputFiles(pdf);
    await uploaded;
    await expect(admin.getByText(path.basename(pdf))).toBeVisible();
    await admin.getByRole("radio", { name: /Only agents in these groups/ }).click();
    await admin.getByRole("checkbox", { name: /Partner Agencies 2027/ }).click();
    await admin.getByLabel("Status").selectOption("published");
    await admin.getByRole("button", { name: "Create trip" }).click();
    await expect(admin).toHaveURL(/\/admin\/fam-trips\/[0-9a-f-]{36}/);
    await admin.close();

    const { data: trip } = await db.from("hub_fam_trips").select("id, slug, timing_label, audience, file_key").eq("title", title).single();
    expect(trip).toMatchObject({ timing_label: null, audience: "groups" });
    expect(trip!.file_key).toMatch(/^documents\/fam-trips\//);

    // Emily is not in the group: details and PDF yes, form no.
    const outsider = await browser.newPage();
    await signIn(outsider, "emily.nguyen@example.com");
    await outsider.goto("/fam-trips");
    const card = outsider.getByRole("link", { name: new RegExp(title) }).first();
    await expect(card).toContainText("Dates to be confirmed");
    await expect(card).toContainText("Group trip");
    await outsider.goto(`/fam-trips/${trip!.slug}`);
    await expect(outsider.getByRole("heading", { name: "Reserved for a group" })).toBeVisible();
    await expect(outsider.getByText(/This trip is for agents of Partner Agencies 2027/).filter({ visible: true })).toBeVisible();
    await expect(outsider.getByRole("link", { name: /Open the itinerary/ }).filter({ visible: true })).toHaveAttribute("href", `/api/hub/fam-trips/${trip!.id}/file`);
    await expect(outsider.getByRole("link", { name: /Register interest/ })).toHaveCount(0);
    await outsider.goto(`/fam-trips/${trip!.slug}/interest`);
    await expect(outsider).toHaveURL(new RegExp(`/fam-trips/${trip!.slug}$`));
    await outsider.close();

    // James is in the group: he gets the form.
    const member = await browser.newPage();
    await signIn(member, "james.carter@example.com");
    await member.goto(`/fam-trips/${trip!.slug}`);
    await member.getByRole("link", { name: /Register interest/ }).first().click();
    await expect(member).toHaveURL(new RegExp(`/fam-trips/${trip!.slug}/interest$`));
    await member.close();
  } finally {
    const { data } = await db.from("hub_fam_trips").select("file_key").eq("title", title).maybeSingle();
    if (data?.file_key) await client.send(new DeleteObjectCommand({ Bucket: buckets.private, Key: data.file_key })).catch(() => {});
    await db.from("hub_fam_trips").delete().eq("title", title);
    unlinkSync(pdf);
  }
});
