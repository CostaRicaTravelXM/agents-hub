/** Everything about a Drive file that is safe to know in the browser. */
export type DriveItem = {
  id: string;
  name: string;
  mimeType: string;
  isFolder: boolean;
  /** Bytes. Google files (Docs, Slides) have none. */
  size: number | null;
};

const GOOGLE_NATIVE = "application/vnd.google-apps.";
const ADD_ON_FILE = "application/vnd.google-apps.drive-sdk";

export const driveThumbnail = (id: string, width = 600) => `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${width}`;
export const drivePreview = (id: string) => `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`;
export const driveDownload = (id: string) => `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
export const driveOpen = (id: string) => `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`;

/** Docs, Sheets and Slides have no file to download; they can only be opened. */
export const canDownload = (item: Pick<DriveItem, "mimeType">) => !item.mimeType.startsWith(GOOGLE_NATIVE);

/** "1_Arts Culture & Entertainment" sorts first in Drive and reads "Arts Culture & Entertainment" here. */
/** Saved by a Drive add-on: Google has no picture or file for it, only a page to open. */
export const opensInGoogleOnly = (item: Pick<DriveItem, "mimeType">) => item.mimeType.startsWith(ADD_ON_FILE);

export function displayName(name: string) {
  return name.replace(/^\d+_\s*/, "") || name;
}

/** "Guide.pdf" or "1_Guide to the flyers": how to use the folder. It is shown first, on its own. */
export function isGuide(item: Pick<DriveItem, "name" | "isFolder">) {
  return !item.isFolder && /^guide\b/i.test(displayName(item.name));
}

/** Any canva.com or canva.link address, with or without the scheme, not glued to a longer host. */
const CANVA_URL = /(?<![\w.-])(?:https?:\/\/)?(?:[a-z0-9-]+\.)*canva\.(?:com|link)\/[^\s<>"')\]]+/gi;

/**
 * The editable Canva design the team linked in a Drive comment, or null. A bare
 * "canva.com" is not a design, so a link needs a path to count.
 */
export function canvaLinkIn(texts: string[]): string | null {
  for (const text of texts) {
    for (const [match] of text.matchAll(CANVA_URL)) {
      let url: URL;
      try {
        url = new URL(/^https?:\/\//i.test(match) ? match : `https://${match}`);
      } catch {
        continue;
      }
      const host = url.hostname.toLowerCase();
      if (host !== "canva.link" && host !== "canva.com" && !host.endsWith(".canva.com")) continue;
      if (url.pathname.length < 2) continue;
      url.protocol = "https:";
      return url.toString();
    }
  }
  return null;
}

export function fileKind(mimeType: string) {
  if (mimeType.startsWith("image/")) return "Photo";
  if (mimeType.startsWith("video/")) return "Video";
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith(ADD_ON_FILE)) return "Opens in Google";
  if (mimeType.startsWith(GOOGLE_NATIVE)) return "Google file";
  return "File";
}
