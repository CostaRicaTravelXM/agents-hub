import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DriveError, driveFolderId, listFolder, resolveDrivePath } from "@/lib/hub/drive";
import { canDownload, displayName, fileKind, opensInGoogleOnly } from "@/lib/hub/drive-links";

const ROOT = "rootFolder0001";
const CHILD = "childFolder001";
const FOLDER = "application/vnd.google-apps.folder";

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe("Drive links", () => {
  it("reads the folder id from the links people paste", () => {
    expect(driveFolderId(`https://drive.google.com/drive/folders/${ROOT}?usp=sharing`)).toBe(ROOT);
    expect(driveFolderId(`https://drive.google.com/drive/u/0/folders/${ROOT}`)).toBe(ROOT);
    expect(driveFolderId(`https://drive.google.com/open?id=${ROOT}`)).toBe(ROOT);
  });

  it("refuses anything that is not a Drive folder", () => {
    expect(driveFolderId("https://www.canva.com/folder/abcdefghijklmnop")).toBeNull();
    expect(driveFolderId(`https://evil.example/drive/folders/${ROOT}`)).toBeNull();
    expect(driveFolderId(`https://drive.google.com/file/d/${ROOT}/view`)).toBeNull();
    expect(driveFolderId("https://drive.google.com/drive/folders/x' or name contains 'y")).toBeNull();
    expect(driveFolderId("not a url")).toBeNull();
  });

  it("hides the sort prefix and names file types in plain words", () => {
    expect(displayName("1_Arts Culture & Entertainment")).toBe("Arts Culture & Entertainment");
    expect(displayName("FAMtrips Flyer")).toBe("FAMtrips Flyer");
    expect(fileKind("image/jpeg")).toBe("Photo");
    expect(fileKind("application/pdf")).toBe("PDF");
    expect(canDownload({ mimeType: "image/png" })).toBe(true);
    expect(canDownload({ mimeType: "application/vnd.google-apps.document" })).toBe(false);
  });

  it("sends files saved by a Drive add-on to Google, since it has no picture or file for them", () => {
    const addOn = { mimeType: "application/vnd.google-apps.drive-sdk.94859032195" };
    expect(opensInGoogleOnly(addOn)).toBe(true);
    expect(canDownload(addOn)).toBe(false);
    expect(fileKind(addOn.mimeType)).toBe("Opens in Google");
    expect(opensInGoogleOnly({ mimeType: "application/vnd.google-apps.document" })).toBe(false);
  });
});

describe("listFolder", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubEnv("GOOGLE_DRIVE_API_KEY", "secret-key");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("follows every page and puts folders first in natural order", async () => {
    fetchMock
      .mockResolvedValueOnce(respond({ files: [{ id: "f10", name: "10_b", mimeType: "image/png", size: "5" }], nextPageToken: "two" }))
      .mockResolvedValueOnce(
        respond({
          files: [
            { id: "f2", name: "2_a", mimeType: "image/png" },
            { id: "d1", name: "z folder", mimeType: FOLDER },
          ],
        }),
      );
    const items = await listFolder(ROOT);
    expect(items.map((i) => i.id)).toEqual(["d1", "f2", "f10"]);
    expect(items[2].size).toBe(5);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const first = new URL(fetchMock.mock.calls[0][0]);
    expect(first.searchParams.get("q")).toBe(`'${ROOT}' in parents and trashed = false`);
    expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get("pageToken")).toBe("two");
  });

  it("treats a shortcut as the thing it points to", async () => {
    fetchMock.mockResolvedValueOnce(
      respond({
        files: [
          { id: "s1", name: "Shared", mimeType: "application/vnd.google-apps.shortcut", shortcutDetails: { targetId: CHILD, targetMimeType: FOLDER } },
          { id: "s2", name: "Broken", mimeType: "application/vnd.google-apps.shortcut" },
        ],
      }),
    );
    const items = await listFolder(ROOT);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: CHILD, isFolder: true });
  });

  it("never sends a malformed id to Google", async () => {
    expect(await listFolder("x' or name contains 'y")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails without the key in the message", async () => {
    fetchMock.mockResolvedValueOnce(respond({ error: "denied" }, 403));
    const error = await listFolder(ROOT).catch((e) => e);
    expect(error).toBeInstanceOf(DriveError);
    expect(error.status).toBe(403);
    expect(error.message).not.toContain("secret-key");

    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed https://x?key=secret-key"));
    const offline = await listFolder(ROOT).catch((e) => e);
    expect(offline).toBeInstanceOf(DriveError);
    expect(offline.message).not.toContain("secret-key");
  });

  it("does not call Google when there is no key", async () => {
    vi.stubEnv("GOOGLE_DRIVE_API_KEY", "");
    await expect(listFolder(ROOT)).rejects.toBeInstanceOf(DriveError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("resolveDrivePath", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubEnv("GOOGLE_DRIVE_API_KEY", "secret-key");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (url: string) => {
      const q = new URL(url).searchParams.get("q") ?? "";
      if (q.includes(ROOT)) return respond({ files: [{ id: CHILD, name: "1_Flyers", mimeType: FOLDER }, { id: "aFileInRoot01", name: "Guide.pdf", mimeType: "application/pdf" }] });
      if (q.includes(CHILD)) return respond({ files: [{ id: "aFileInChild1", name: "Flyer.png", mimeType: "image/png" }] });
      throw new Error(`Unexpected folder requested: ${q}`);
    });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("opens a real child and names the way there", async () => {
    const folder = await resolveDrivePath(ROOT, [CHILD]);
    expect(folder?.crumbs).toEqual([{ id: CHILD, name: "1_Flyers" }]);
    expect(folder?.items.map((i) => i.id)).toEqual(["aFileInChild1"]);
  });

  it("refuses a folder outside the root without ever listing it", async () => {
    await expect(resolveDrivePath(ROOT, ["someoneElsesFolder"])).resolves.toBeNull();
    const asked = fetchMock.mock.calls.map(([u]) => new URL(u).searchParams.get("q") ?? "");
    expect(asked.some((q) => q.includes("someoneElsesFolder"))).toBe(false);
  });

  it("refuses a file used as a folder, and absurdly deep paths", async () => {
    await expect(resolveDrivePath(ROOT, ["aFileInRoot01"])).resolves.toBeNull();
    await expect(resolveDrivePath(ROOT, Array(13).fill(CHILD))).resolves.toBeNull();
  });
});
