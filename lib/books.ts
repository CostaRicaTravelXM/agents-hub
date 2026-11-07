/** Page arithmetic for the book reader. Pure, so it is easy to test. */
export const DEFAULT_PAGE_ASPECT = 0.7727; // US Letter, width / height
export type ReaderMode = "single" | "spread";
export type PageWidth = 800 | 1600;

export function clampPage(page: number, count: number) {
  const n = Number.isFinite(page) ? Math.round(page) : 1;
  return Math.min(Math.max(1, n), Math.max(1, count));
}

/** First page of the spread that contains `page`: spreads are (1,2), (3,4), … */
export function spreadStart(page: number, mode: ReaderMode) {
  return mode === "spread" && page % 2 === 0 ? page - 1 : page;
}

export function spreadPages(first: number, mode: ReaderMode, count: number): number[] {
  return mode === "spread" ? [first, first + 1].filter((p) => p <= count) : [first];
}

export function stepFor(mode: ReaderMode) {
  return mode === "spread" ? 2 : 1;
}

export function pageLabel(first: number, mode: ReaderMode, count: number) {
  const pages = spreadPages(first, mode, count);
  return pages.length === 2 ? `Pages ${pages[0]}–${pages[1]} of ${count}` : `Page ${pages[0]} of ${count}`;
}

export function pageImageUrl(bookId: string, page: number, width: PageWidth, version: number) {
  return `/api/hub/books/${bookId}/page/${page}?w=${width}&v=${version}`;
}

/** Retina screens get the 1600px render; everything else the lighter 800px one. */
export function pickWidth(cssWidth: number, dpr: number): PageWidth {
  return cssWidth * dpr > 900 ? 1600 : 800;
}

/**
 * Two pages side by side only on a landscape screen where each is at least
 * 320px wide. A portrait iPad gets one large page: two narrow ones are harder to read.
 */
export function modeFor(stageWidth: number, stageHeight: number, aspect: number): ReaderMode {
  const pageW = Math.min(stageWidth / 2, stageHeight * aspect);
  return stageWidth >= 680 && stageWidth > stageHeight && pageW >= 320 ? "spread" : "single";
}

export function pageBox(stageWidth: number, stageHeight: number, aspect: number, mode: ReaderMode) {
  const maxW = mode === "spread" ? stageWidth / 2 : stageWidth;
  const w = Math.floor(Math.max(120, Math.min(maxW, stageHeight * aspect)));
  return { w, h: Math.floor(w / aspect) };
}
