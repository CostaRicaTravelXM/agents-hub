import "server-only";
import { env } from "@/lib/env";
import type { DriveItem } from "@/lib/hub/drive-links";

const FOLDER_MIME = "application/vnd.google-apps.folder";
const SHORTCUT_MIME = "application/vnd.google-apps.shortcut";
/** Drive ids are URL-safe. Checking this keeps anything else out of the search query. */
const DRIVE_ID = /^[A-Za-z0-9_-]{10,}$/;
const MAX_PAGES = 10;
const MAX_DEPTH = 12;
/** New files appear within five minutes without touching the Hub. */
const REVALIDATE_SECONDS = 300;

/** Google could not answer. The message never contains the request URL, which holds the key. */
export class DriveError extends Error {
  constructor(public status: number | null) {
    super(`Google Drive request failed${status ? ` (${status})` : ""}`);
    this.name = "DriveError";
  }
}

/** The folder id in a Drive link, or null when the link is not a Drive folder. */
export function driveFolderId(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.hostname !== "drive.google.com") return null;
  const id = u.pathname.match(/\/folders\/([^/]+)/)?.[1] ?? (u.pathname.startsWith("/file/") ? null : u.searchParams.get("id"));
  return id && DRIVE_ID.test(id) ? id : null;
}

type RawFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  shortcutDetails?: { targetId?: string; targetMimeType?: string };
};

function toItem(f: RawFile): DriveItem | null {
  const shortcut = f.mimeType === SHORTCUT_MIME;
  const id = shortcut ? f.shortcutDetails?.targetId : f.id;
  const mimeType = shortcut ? f.shortcutDetails?.targetMimeType : f.mimeType;
  if (!id || !mimeType) return null;
  return { id, name: f.name, mimeType, isFolder: mimeType === FOLDER_MIME, size: f.size ? Number(f.size) : null };
}

/** Folders first, then files, with numbers in their natural order (2 before 10). */
function byFolderThenName(a: DriveItem, b: DriveItem) {
  if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
  return a.name.localeCompare(b.name, "en", { numeric: true, sensitivity: "base" });
}

export async function listFolder(folderId: string): Promise<DriveItem[]> {
  if (!DRIVE_ID.test(folderId)) return [];
  const key = env.googleDriveApiKey;
  if (!key) throw new DriveError(null);

  const items: DriveItem[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const query = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken,files(id,name,mimeType,size,shortcutDetails(targetId,targetMimeType))",
      pageSize: "200",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
      key,
    });
    if (pageToken) query.set("pageToken", pageToken);

    let res: Response;
    try {
      res = await fetch(`${env.googleDriveApiUrl}?${query}`, { next: { revalidate: REVALIDATE_SECONDS } });
    } catch {
      throw new DriveError(null);
    }
    if (!res.ok) throw new DriveError(res.status);

    const body = (await res.json()) as { files?: RawFile[]; nextPageToken?: string };
    for (const f of body.files ?? []) {
      const item = toItem(f);
      if (item) items.push(item);
    }
    pageToken = body.nextPageToken;
    if (!pageToken) break;
  }
  return items.sort(byFolderThenName);
}

export type DriveFolder = { crumbs: { id: string; name: string }[]; items: DriveItem[] };

/**
 * Walks from the root one folder at a time. Each step must be a real child of the
 * one before it, so the Hub can never be used to browse a folder outside the root.
 * Returns null for anything else, and the page answers with a 404.
 */
export async function resolveDrivePath(rootId: string, segments: string[]): Promise<DriveFolder | null> {
  if (segments.length > MAX_DEPTH) return null;
  const crumbs: DriveFolder["crumbs"] = [];
  let current = rootId;
  for (const segment of segments) {
    const children = await listFolder(current);
    const folder = children.find((c) => c.isFolder && c.id === segment);
    if (!folder) return null;
    crumbs.push({ id: folder.id, name: folder.name });
    current = folder.id;
  }
  return { crumbs, items: await listFolder(current) };
}
