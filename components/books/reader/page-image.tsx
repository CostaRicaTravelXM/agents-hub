"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { isPageReady, markPageReady } from "@/components/books/reader/page-cache";
import { pageImageUrl, type PageWidth } from "@/lib/books";

/** One rendered page. A failed load shows a retry tile instead of a blank. */
export function PageImage({
  bookId,
  version,
  page,
  width,
  alt,
  priority,
}: {
  bookId: string;
  version: number;
  page: number;
  width: PageWidth;
  alt: string;
  priority?: boolean;
}) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setFailed(false), [page, width]);
  const src = `${pageImageUrl(bookId, page, width, version)}${attempt ? `&r=${attempt}` : ""}`;
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  // Already downloaded (it was fetched ahead): show it at once, with no fade. Decided once per page.
  const instant = useMemo(() => isPageReady(src), [src]);
  if (failed) {
    return (
      <div className="grid size-full place-items-center bg-sunken p-6 text-center">
        <div>
          <p className="font-ui text-[16px] font-semibold text-ink">Page {page} did not load</p>
          <button
            type="button"
            onClick={() => {
              setFailed(false);
              setAttempt((a) => a + 1);
            }}
            className="mt-3 inline-flex h-11 items-center gap-2 rounded-md bg-primary px-4 font-ui text-[15px] font-semibold text-white hover:bg-primary-hover"
          >
            <RotateCcw aria-hidden className="size-4 stroke-[2]" /> Try again
          </button>
        </div>
      </div>
    );
  }
  const loaded = instant || loadedSrc === src;
  return (
    <div className="relative size-full">
      {/* Never the previous page: until this one arrives the paper shows that it is on its way. */}
      {loaded ? null : (
        <div className="xm-page-wait" role="status">
          <span>Loading page {page}</span>
        </div>
      )}
      {/* Plain <img>: the route serves a private, already-sized WebP, so next/image would only add a hop.
          Keyed by its address, so a new page starts from an empty image instead of keeping the old picture. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={src}
        src={src}
        alt={alt}
        draggable={false}
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        className={instant ? undefined : "xm-page-fade"}
        data-loaded={loaded}
        onLoad={() => {
          markPageReady(src);
          setLoadedSrc(src);
        }}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
