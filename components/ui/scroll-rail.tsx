"use client";

import { useEffect, useRef } from "react";

/**
 * Marks a sideways-scrolling row with data-more-start / data-more-end while there is
 * more to see in that direction. The `xm-fade-x` utility fades that edge, so a row
 * that runs off the screen reads as "swipe for more" rather than as cut off.
 */
export function useEdgeFade<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const left = Math.abs(el.scrollLeft);
      const rest = el.scrollWidth - el.clientWidth - left;
      el.toggleAttribute("data-more-start", left > 2);
      el.toggleAttribute("data-more-end", rest > 2);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const resize = new ResizeObserver(update);
    resize.observe(el);
    for (const child of Array.from(el.children)) resize.observe(child);
    return () => {
      el.removeEventListener("scroll", update);
      resize.disconnect();
    };
  }, []);
  return ref;
}

/** A list or row that scrolls sideways on small screens, with its edges faded while there is more. */
export function ScrollRail({ as = "div", className, ...props }: React.HTMLAttributes<HTMLElement> & { as?: "div" | "ul" }) {
  const ref = useEdgeFade<HTMLElement>();
  const Tag = as;
  return <Tag ref={ref as React.Ref<never>} className={`xm-fade-x ${className ?? ""}`} {...props} />;
}
