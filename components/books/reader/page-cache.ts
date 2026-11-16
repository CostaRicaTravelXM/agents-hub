/**
 * Which page images this tab has already downloaded, and a way to fetch the
 * next ones before the reader gets there. A page that is known here is shown
 * at once; any other page shows a waiting state instead of the previous page.
 */
const ready = new Set<string>();
// Kept referenced so the browser does not drop a download that is still running.
const pending = new Map<string, HTMLImageElement>();

export function isPageReady(url: string) {
  return ready.has(url);
}

export function markPageReady(url: string) {
  ready.add(url);
  pending.delete(url);
}

/** Downloads a page in the background, behind the pages that are on screen. */
export function preloadPage(url: string) {
  if (typeof Image === "undefined" || ready.has(url) || pending.has(url)) return;
  const img = new Image();
  img.decoding = "async";
  img.fetchPriority = "low";
  pending.set(url, img);
  img.onload = () => markPageReady(url);
  img.onerror = () => pending.delete(url);
  img.src = url;
}
