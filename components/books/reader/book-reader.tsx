"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { PageImage } from "@/components/books/reader/page-image";
import { ReaderControls } from "@/components/books/reader/reader-controls";
import { ReaderTopBar } from "@/components/books/reader/reader-top-bar";
import { readSavedPage, usePageMemory } from "@/components/books/reader/use-page-memory";
import { notify } from "@/components/ui/toast";
import { clampPage, modeFor, pageBox, pageImageUrl, pageLabel, pickWidth, spreadPages, spreadStart, stepFor, type PageWidth, type ReaderMode } from "@/lib/books";
import { cn } from "@/lib/utils";

export type ReaderBook = { id: string; slug: string; title: string; pageCount: number; pageAspect: number; fileVersion: number };

const EASE = "cubic-bezier(0.2, 0.6, 0.25, 1)";
const TURN_MS = 420;
const COMMIT_AT = 0.3;

type Dir = 1 | -1;
/** Geometry of the leaf that moves for a given turn. Angles in degrees around the Y axis. */
type Leaf = { dir: Dir; side: "left" | "right" | "full"; from: number; to: number; front: number; back: number | null };

function leafFor(mode: ReaderMode, dir: Dir, first: number, count: number): Leaf | null {
  if (mode === "spread") {
    if (dir === 1) {
      if (first + 2 > count) return null;
      return { dir, side: "right", from: 0, to: -180, front: first + 1, back: first + 2 <= count ? first + 2 : null };
    }
    if (first <= 1) return null;
    return { dir, side: "left", from: 0, to: 180, front: first, back: first - 1 };
  }
  // Single page: the current page folds away to the left; a previous page unfolds from the left.
  if (dir === 1) return first + 1 <= count ? { dir, side: "full", from: 0, to: -90, front: first, back: null } : null;
  return first > 1 ? { dir, side: "full", from: -90, to: 0, front: first - 1, back: null } : null;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

export function BookReader({ book, startPage }: { book: ReaderBook; startPage: number }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const leafRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  const [mode, setMode] = useState<ReaderMode>("single");
  const [stage, setStage] = useState({ w: 360, h: 480 });
  const [width, setWidth] = useState<PageWidth>(800);
  const [page, setFirst] = useState(() => clampPage(startPage, book.pageCount));
  const first = useMemo(() => spreadStart(page, mode), [page, mode]);
  const [resumed, setResumed] = useState(false);
  const [leaf, setLeaf] = useState<Leaf | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenSupported, setFullscreenSupported] = useState(false);

  const angle = useRef(0);
  const animating = useRef(false);
  const gesture = useRef<{ id: number; x: number; y: number; t: number; active: boolean; dir: Dir } | null>(null);

  const step = stepFor(mode);
  const canNext = first + step <= book.pageCount;
  const canPrev = first > 1;
  const box = pageBox(stage.w, stage.h, book.pageAspect, mode);
  const pages = spreadPages(first, mode, book.pageCount);

  usePageMemory(book.id, first, resumed);

  /* ---------- resume from the saved page ---------- */
  useEffect(() => {
    const resume = clampPage(Math.max(startPage, readSavedPage(book.id) ?? 1), book.pageCount);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFirst(resume);
    setResumed(true);
    if (resume <= 1) return;
    // A moment later: on a fresh load the toaster is not listening yet.
    const timer = setTimeout(() => {
      notify.info(`Continuing from page ${resume}`, {
        action: { label: "Start over", onClick: () => setFirst(1) },
        duration: 6000,
        // The controls live at the bottom of the reader; the toast must not cover them.
        position: "top-center",
      });
    }, 300);
    return () => clearTimeout(timer);
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.id]);

  /* ---------- stage size, mode and image size ---------- */
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const css = getComputedStyle(el);
      const w = Math.max(200, el.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight));
      const h = Math.max(160, el.clientHeight - parseFloat(css.paddingTop) - parseFloat(css.paddingBottom));
      setStage({ w, h });
      const m = modeFor(w, h, book.pageAspect);
      setMode(m);
      setWidth(pickWidth(pageBox(w, h, book.pageAspect, m).w, window.devicePixelRatio || 1));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [book.pageAspect, zoomed]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFullscreenSupported(Boolean(document.fullscreenEnabled));
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  /* ---------- preload the neighbouring spreads ---------- */
  useEffect(() => {
    const wanted = new Set<number>();
    for (const p of [...spreadPages(first + step, mode, book.pageCount), ...spreadPages(Math.max(1, first - step), mode, book.pageCount)]) wanted.add(p);
    for (const p of wanted) {
      if (p < 1 || p > book.pageCount) continue;
      const img = new Image();
      img.src = pageImageUrl(book.id, p, width, book.fileVersion);
    }
  }, [first, mode, step, width, book]);

  /* ---------- turning ---------- */
  const applyAngle = useCallback(
    (a: number, l: Leaf) => {
      angle.current = a;
      const el = leafRef.current;
      if (!el) return;
      el.style.transform = `rotateY(${a}deg)`;
      const progress = Math.abs((a - l.from) / (l.to - l.from));
      el.style.setProperty("--leaf-shade", String(Math.min(1, Math.max(0, l.dir === 1 ? progress : 1 - progress)) * 0.9));
    },
    [],
  );

  const commit = useCallback(
    (dir: Dir) => {
      setFirst((f) => clampPage(f + dir * stepFor(mode), book.pageCount));
    },
    [mode, book.pageCount],
  );

  const settle = useCallback(
    (l: Leaf, toEnd: boolean, speed = 1) => {
      const el = leafRef.current;
      const target = toEnd ? l.to : l.from;
      if (!el || reduced) {
        if (toEnd) commit(l.dir);
        setLeaf(null);
        animating.current = false;
        return;
      }
      animating.current = true;
      const remaining = Math.abs(target - angle.current) / Math.abs(l.to - l.from);
      const duration = Math.max(120, Math.min(TURN_MS, TURN_MS * remaining * speed));
      const anim = el.animate([{ transform: `rotateY(${angle.current}deg)` }, { transform: `rotateY(${target}deg)` }], { duration, easing: EASE, fill: "forwards" });
      const shade = el.animate([{ "--leaf-shade": el.style.getPropertyValue("--leaf-shade") || "0" }, { "--leaf-shade": toEnd && l.dir === 1 ? "0.9" : "0" }] as Keyframe[], { duration, easing: EASE, fill: "forwards" });
      const done = () => {
        shade.cancel();
        if (toEnd) commit(l.dir);
        setLeaf(null);
        animating.current = false;
      };
      anim.onfinish = done;
      anim.oncancel = done;
    },
    [commit, reduced],
  );

  /** Button, keyboard or slider: a full turn with no finger involved. */
  const turn = useCallback(
    (dir: Dir) => {
      if (animating.current || zoomed) return;
      const l = leafFor(mode, dir, first, book.pageCount);
      if (!l) return;
      if (reduced) {
        commit(dir);
        return;
      }
      animating.current = true;
      angle.current = l.from;
      setLeaf(l);
    },
    [mode, first, book.pageCount, reduced, zoomed, commit],
  );

  // A leaf that was created by a button starts moving as soon as it is in the DOM.
  useEffect(() => {
    if (!leaf || !animating.current) return;
    if (gesture.current?.active) return;
    applyAngle(leaf.from, leaf);
    const id = requestAnimationFrame(() => settle(leaf, true));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaf]);

  const goTo = useCallback(
    (target: number) => {
      if (animating.current) return;
      setLeaf(null);
      setFirst(clampPage(target, book.pageCount));
    },
    [book.pageCount],
  );

  /* ---------- gestures ---------- */
  const onPointerDown = (e: React.PointerEvent) => {
    if (zoomed || animating.current || leaf) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button, a, input")) return;
    if (gesture.current && gesture.current.id !== e.pointerId) {
      // A second finger: this is a pinch, not a page turn.
      gesture.current = null;
      return;
    }
    gesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), active: false, dir: 1 };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.active) {
      if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy)) return;
      const dir: Dir = dx < 0 ? 1 : -1;
      const l = leafFor(mode, dir, first, book.pageCount);
      if (!l) {
        gesture.current = null;
        return;
      }
      g.active = true;
      g.dir = dir;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      angle.current = l.from;
      setLeaf(l);
      return;
    }
    const l = leafRef.current ? leafFor(mode, g.dir, first, book.pageCount) : null;
    if (!l) return;
    const travel = mode === "spread" ? box.w : box.w * 0.8;
    const progress = Math.min(1, Math.max(0, (g.dir === 1 ? -dx : dx) / travel));
    applyAngle(l.from + (l.to - l.from) * progress, l);
  };
  const endGesture = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    gesture.current = null;
    if (!g.active) return;
    const l = leafFor(mode, g.dir, first, book.pageCount);
    if (!l) {
      setLeaf(null);
      return;
    }
    const progress = Math.abs((angle.current - l.from) / (l.to - l.from));
    const dt = Math.max(1, performance.now() - g.t);
    const velocity = (Math.abs(e.clientX - g.x) / dt) * (g.dir === 1 ? (e.clientX < g.x ? 1 : -1) : e.clientX > g.x ? 1 : -1);
    settle(l, progress > COMMIT_AT || velocity > 0.5);
  };

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.closest("[role=dialog]"))) return;
      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
        case " ":
          e.preventDefault();
          if (zoomed) goTo(first + 1);
          else turn(1);
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          if (zoomed) goTo(first - 1);
          else turn(-1);
          break;
        case "Home":
          e.preventDefault();
          goTo(1);
          break;
        case "End":
          e.preventDefault();
          goTo(book.pageCount);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [turn, goTo, first, zoomed, book.pageCount]);

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await rootRef.current?.requestFullscreen?.();
  };

  /* ---------- render helpers ---------- */
  const alt = (p: number) => `${book.title}, page ${p}`;
  const pageEl = (p: number | null, extra?: string, priority?: boolean) => (
    <div className={cn("xm-page relative", extra)} style={{ width: box.w, height: box.h }}>
      {p && p >= 1 && p <= book.pageCount ? <PageImage bookId={book.id} version={book.fileVersion} page={p} width={width} alt={alt(p)} priority={priority} /> : null}
    </div>
  );

  // What sits underneath the moving leaf.
  const baseLeft = leaf ? (leaf.dir === 1 ? first : first - 2) : first;
  const baseRight = leaf ? (leaf.dir === 1 ? first + 3 : first + 1) : first + 1;
  const singleBase = leaf ? (leaf.dir === 1 ? first + 1 : first) : first;

  return (
    <div ref={rootRef} className="xm-reader flex h-dvh flex-col overflow-hidden">
      <ReaderTopBar
        title={book.title}
        downloadHref={`/api/hub/books/${book.id}?mode=download`}
        zoomed={zoomed}
        onToggleZoom={() => setZoomed((z) => !z)}
        fullscreenSupported={fullscreenSupported}
        fullscreen={fullscreen}
        onToggleFullscreen={() => void toggleFullscreen()}
      />

      {zoomed ? (
        <div className="relative min-h-0 flex-1 overflow-auto px-2 py-3">
          <div className="mx-auto" style={{ width: Math.round(Math.max(stage.w - 16, box.w * 1.6)) }}>
            {pages.map((p) => (
              <div key={p} className="xm-page mb-3" style={{ aspectRatio: String(book.pageAspect) }}>
                <PageImage bookId={book.id} version={book.fileVersion} page={p} width={1600} alt={alt(p)} priority />
              </div>
            ))}
          </div>
          <p className="pb-2 text-center text-[15px] text-muted">Larger text: scroll to read. Use Previous and Next to change page.</p>
        </div>
      ) : (
        <div
          ref={stageRef}
          className="xm-book-stage relative flex min-h-0 flex-1 items-center justify-center overflow-hidden py-2 md:px-6 md:py-6"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endGesture}
          onPointerCancel={endGesture}
          onLostPointerCapture={endGesture}
          aria-label={pageLabel(first, mode, book.pageCount)}
        >
          {mode === "spread" ? (
            <div className="xm-spine relative flex" style={{ width: box.w * 2, height: box.h }}>
              {pageEl(baseLeft, undefined, true)}
              {pageEl(baseRight, undefined, true)}
              {leaf ? (
                <div
                  ref={leafRef}
                  className={cn("xm-leaf", leaf.side === "left" ? "xm-leaf--left" : "xm-leaf--right")}
                  style={{
                    width: box.w,
                    height: box.h,
                    left: leaf.side === "left" ? 0 : box.w,
                    transformOrigin: leaf.side === "left" ? "right center" : "left center",
                    transform: `rotateY(${leaf.from}deg)`,
                  }}
                  aria-hidden
                >
                  <div className="xm-leaf__face xm-page">
                    <PageImage bookId={book.id} version={book.fileVersion} page={leaf.front} width={width} alt="" priority />
                    <div className="xm-leaf__shade" />
                  </div>
                  <div className="xm-leaf__face xm-leaf__face--back xm-page">
                    {leaf.back ? <PageImage bookId={book.id} version={book.fileVersion} page={leaf.back} width={width} alt="" priority /> : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="relative" style={{ width: box.w, height: box.h }}>
              {pageEl(singleBase, "absolute inset-0", true)}
              {leaf ? (
                <div
                  ref={leafRef}
                  className="xm-leaf xm-leaf--right"
                  style={{ width: box.w, height: box.h, left: 0, transformOrigin: "left center", transform: `rotateY(${leaf.from}deg)` }}
                  aria-hidden
                >
                  <div className="xm-leaf__face xm-page">
                    <PageImage bookId={book.id} version={book.fileVersion} page={leaf.front} width={width} alt="" priority />
                    <div className="xm-leaf__shade" />
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      <ReaderControls
        label={pageLabel(first, mode, book.pageCount)}
        page={first}
        step={step}
        pageCount={book.pageCount}
        canPrev={canPrev}
        canNext={canNext}
        onPrev={() => (zoomed ? goTo(first - 1) : turn(-1))}
        onNext={() => (zoomed ? goTo(first + 1) : turn(1))}
        onGoTo={goTo}
      />
    </div>
  );
}
