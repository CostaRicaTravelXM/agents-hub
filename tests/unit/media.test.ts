import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MULTIPART_THRESHOLD, PUBLIC_CACHE_CONTROL, isUploadKey, partSize, uploadDestination } from "@/lib/media";

const R = "a1b2c3d4";

describe("where admin uploads land", () => {
  it.each([
    ["course cover", "image", "covers", "Arenal Hero.JPG", "public", "images/covers/a1b2c3d4-arenal-hero.jpg"],
    ["video poster", "image", "posters", "poster.png", "public", "images/posters/a1b2c3d4-poster.png"],
    ["book cover", "image", "books", "cover.webp", "public", "images/books/a1b2c3d4-cover.webp"],
    ["offer photo", "image", "offers", "Playa.jpeg", "public", "images/offers/a1b2c3d4-playa.jpeg"],
    ["FAM trip photo", "image", "fam-trips", "Nosara Retreat.jpg", "public", "images/fam-trips/a1b2c3d4-nosara-retreat.jpg"],
    ["lesson video", "video", "0f9e8d7c", "Módulo 1.mp4", "private", "videos/0f9e8d7c/a1b2c3d4-modulo-1.mp4"],
    ["lesson PDF", "document", "0f9e8d7c", "Guide.pdf", "private", "documents/0f9e8d7c/a1b2c3d4-guide.pdf"],
    ["course resource", "document", "resources-0f9e8d7c", "Rates 2027.xlsx", "private", "documents/resources-0f9e8d7c/a1b2c3d4-rates-2027.xlsx"],
    ["book PDF", "document", "books", "Working.pdf", "private", "documents/books/a1b2c3d4-working.pdf"],
    ["offer PDF", "document", "offers", "Flyer.pdf", "private", "documents/offers/a1b2c3d4-flyer.pdf"],
  ] as const)("%s", (_, kind, scope, filename, bucket, key) => {
    const d = uploadDestination(kind, filename, scope, R);
    expect(d).toEqual({ bucket, key });
    expect(isUploadKey(kind, d.key)).toBe(true);
  });

  it("only accepts keys a real upload of that kind could have made", () => {
    expect(isUploadKey("video", "documents/books/a1b2c3d4-x.pdf")).toBe(false);
    expect(isUploadKey("video", "videos/../../etc/a1b2c3d4-x.mp4")).toBe(false);
    expect(isUploadKey("video", "videos/x/y/a1b2c3d4-x.mp4")).toBe(false);
    expect(isUploadKey("image", "images/a1b2c3d4-x.png")).toBe(true);
  });

  it("splits big files into equal parts that stay under 10,000", () => {
    expect(MULTIPART_THRESHOLD).toBe(100 * 1024 ** 2);
    expect(partSize(150 * 1024 ** 2)).toBe(16 * 1024 ** 2);
    const five = 5 * 1024 ** 3;
    expect(Math.ceil(five / partSize(five))).toBeLessThanOrEqual(10_000);
    expect(Math.ceil((400 * 1024 ** 3) / partSize(400 * 1024 ** 3))).toBeLessThanOrEqual(10_000);
  });
});

describe("signed uploads", () => {
  beforeEach(() => {
    vi.stubEnv("R2_ENDPOINT", "https://account.r2.cloudflarestorage.com");
    vi.stubEnv("R2_ACCESS_KEY_ID", "id");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "secret");
    vi.resetModules();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("makes public images carry the one-year CDN cache rule, and private files not", async () => {
    const { signedPutUrl } = await import("@/lib/storage");
    const image = await signedPutUrl("public", "images/covers/a1b2c3d4-x.jpg", "image/jpeg");
    expect(image.headers).toEqual({ "Content-Type": "image/jpeg", "Cache-Control": PUBLIC_CACHE_CONTROL });
    expect(new URL(image.url).searchParams.get("X-Amz-SignedHeaders")).toContain("cache-control");

    const video = await signedPutUrl("private", "videos/x/a1b2c3d4-x.mp4", "video/mp4");
    expect(video.headers).toEqual({ "Content-Type": "video/mp4" });
    expect(new URL(video.url).searchParams.get("X-Amz-SignedHeaders")).not.toContain("cache-control");
  });
});
