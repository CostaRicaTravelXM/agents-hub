"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Zoho Forms embedded in the page. Zoho posts its own height after every step
 * ("formperma-url|height"), so the frame grows instead of scrolling inside.
 */
export function ZohoFormFrame({ src, title }: { src: string; title: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(1100);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (typeof e.data !== "string" || e.origin !== "https://forms.zohopublic.com") return;
      const [, h] = e.data.split("|");
      const n = Number(h);
      if (Number.isFinite(n) && n > 200 && n < 20000) setHeight(n + 24);
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
        ref={ref}
        src={src}
        title={title}
        onLoad={() => setLoaded(true)}
        className="w-full border-0 bg-card transition-[height] duration-200 ease-standard"
        style={{ height }}
      />
    </div>
  );
}
