import { openSync, closeSync, writeSync, ftruncateSync, unlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { expect, test } from "@playwright/test";
import { PUBLIC_CACHE_CONTROL } from "../../lib/media";
import { storageClient } from "./admin-client";
import { signIn } from "./helpers";

const BIG = 110 * 1024 * 1024;

test("admin uploads land in the right bucket: photos with the CDN cache rule, big files in parts", async ({ page }) => {
  test.setTimeout(240_000);
  const { client, buckets } = storageClient();
  const stored: { bucket: string; key: string }[] = [];
  const big = path.join(os.tmpdir(), `e2e-upload-${Date.now()}.pdf`);
  const fd = openSync(big, "w");
  writeSync(fd, "%PDF-1.4\n");
  ftruncateSync(fd, BIG);
  closeSync(fd);

  const calls: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/admin/upload/multipart")) calls.push(JSON.parse(r.postData() ?? "{}").action);
  });

  try {
    await signIn(page, "admin@travelxm.test");
    await page.goto("/admin/offers/new");

    // A photo: one request to the public bucket, cached for a year at the CDN.
    const signed = page.waitForResponse((r) => r.url().endsWith("/api/admin/upload") && r.request().method() === "POST");
    await page.locator('input[type="file"][accept*="image/webp"]').setInputFiles(path.join(process.cwd(), "public/photos/fam-trips/papagayo.jpg"));
    const photo = await (await signed).json();
    stored.push({ bucket: buckets.public, key: photo.key });
    expect(photo.bucket).toBe("public");
    expect(photo.key).toMatch(/^images\/offers\/[0-9a-f]{8}-papagayo\.jpg$/);
    await expect
      .poll(async () => (await client.send(new HeadObjectCommand({ Bucket: buckets.public, Key: photo.key })).catch(() => null))?.CacheControl, {
        timeout: 30_000,
      })
      .toBe(PUBLIC_CACHE_CONTROL);

    // A file over 100 MB: goes up in parts to the private bucket and arrives whole.
    const finished = page.waitForResponse(
      (r) => r.url().includes("/api/admin/upload/multipart") && JSON.parse(r.request().postData() ?? "{}").action === "complete",
      { timeout: 180_000 },
    );
    await page.locator('input[type="file"][accept*="application/pdf"]').setInputFiles(big);
    const done = await finished;
    expect(done.status()).toBe(200);
    const pdf = await done.json();
    stored.push({ bucket: buckets.private, key: pdf.key });
    expect(pdf.key).toMatch(/^documents\/offers\/[0-9a-f]{8}-e2e-upload-\d+\.pdf$/);
    expect(pdf.size).toBe(BIG);
    expect(calls).toEqual(["create", "complete"]);
    const head = await client.send(new HeadObjectCommand({ Bucket: buckets.private, Key: pdf.key }));
    expect(head.ContentLength).toBe(BIG);
    expect(head.CacheControl).toBeUndefined();
    await expect(page.getByRole("button", { name: "Replace" }).first()).toBeVisible();
  } finally {
    unlinkSync(big);
    for (const o of stored) await client.send(new DeleteObjectCommand({ Bucket: o.bucket, Key: o.key })).catch(() => {});
  }
});
