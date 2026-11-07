"use client";

import { useEffect, useState, type CSSProperties } from "react";

/**
 * Zoho posts "formperma|height" after every step, but the number is short of the
 * real form: by about 90px on wider screens, and by 150 to 470px on phones, which
 * cut the Submit button off. So on phones the frame is one screen tall and the form
 * scrolls inside it, whatever Zoho reports. From tablet width up it grows with the
 * reported height plus a margin, so the page scrolls as one.
 */
const MARGIN = 120;

export function ZohoFormFrame({ src, title }: { src: string; title: string }) {
  const [height, setHeight] = useState(1100);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (typeof e.data !== "string" || e.origin !== "https://forms.zohopublic.com") return;
      const [, h] = e.data.split("|");
      const n = Number(h);
      if (Number.isFinite(n) && n > 200 && n < 20000) setHeight(Math.ceil(n) + MARGIN);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-lg bg-card shadow-card">
      {!loaded ? (
        <div className="absolute inset-x-0 top-0 p-6" aria-live="polite">
          <p className="text-[16px] text-muted">Loading the form…</p>
        </div>
      ) : null}
      <iframe
        src={src}
        title={title}
        onLoad={() => setLoaded(true)}
        style={{ "--zoho-h": `${height}px` } as CSSProperties}
        className="block h-[calc(100dvh_-_124px_-_env(safe-area-inset-bottom))] min-h-[420px] w-full border-0 bg-card md:h-(--zoho-h) md:transition-[height] md:duration-200 md:ease-standard"
      />
    </div>
  );
}
