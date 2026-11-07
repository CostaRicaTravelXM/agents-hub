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

export function fileKind(mimeType: string) {
  if (mimeType.startsWith("image/")) return "Photo";
  if (mimeType.startsWith("video/")) return "Video";
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith(ADD_ON_FILE)) return "Opens in Google";
  if (mimeType.startsWith(GOOGLE_NATIVE)) return "Google file";
  return "File";
}
