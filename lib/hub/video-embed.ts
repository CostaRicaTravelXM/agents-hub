/**
 * An admin pastes whatever link they have. Google Drive and Wistia share links
 * do not play inside a page, so they become the provider's embed address.
 * Any other https link is kept as it is.
 */
export function toEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url;
  }
  if (u.hostname === "drive.google.com") {
    const id = u.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ?? u.searchParams.get("id");
    return id ? `https://drive.google.com/file/d/${id}/preview` : url;
  }
  if (u.hostname.endsWith(".wistia.com")) {
    const id = u.pathname.match(/\/medias\/([^/]+)/)?.[1];
    return id ? `https://fast.wistia.net/embed/iframe/${id}` : url;
  }
  return url;
}
