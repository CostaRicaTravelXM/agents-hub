"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Maximize, Minimize, Pause, PictureInPicture2, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { notify } from "@/components/ui/toast";
import { cn, formatClock } from "@/lib/utils";

type Props = {
  lessonId: string;
  src: string;
  poster?: string | null;
  title: string;
  startAt: number;
  initialWatchPct: number;
  requiredPct: number;
  completed: boolean;
  nextHref?: string | null;
};

const RATES = [1, 1.25, 1.5, 2];
const BEAT_MS = 10_000;

/** Share of the video actually played: prior coverage (assumed from the start) plus this session's played ranges. */
function coveragePct(video: HTMLVideoElement, priorEnd: number): number {
  const d = video.duration;
  if (!d || !Number.isFinite(d)) return 0;
  const ranges: [number, number][] = [[0, Math.min(priorEnd, d)]];
  for (let i = 0; i < video.played.length; i++) ranges.push([video.played.start(i), video.played.end(i)]);
  ranges.sort((a, b) => a[0] - b[0]);
  let total = 0;
  let [cs, ce] = ranges[0];
  for (const [s, e] of ranges.slice(1)) {
    if (s <= ce + 0.5) ce = Math.max(ce, e);
    else {
      total += ce - cs;
      [cs, ce] = [s, e];
    }
  }
  total += ce - cs;
  // The last second rarely registers as "played"; treat reaching the end as full coverage.
  const pct = (total / d) * 100;
  return Math.min(100, video.ended ? Math.max(pct, 99.5) + 0.5 : pct);
}

export function VideoPlayer(props: Props) {
  const { lessonId, poster, title, startAt, initialWatchPct, requiredPct, nextHref } = props;
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState(props.src);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [watchPct, setWatchPct] = useState(initialWatchPct);
  const [completed, setCompleted] = useState(props.completed);
  const [ended, setEnded] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);

  const priorEnd = useRef(0);
  const playingSince = useRef<number | null>(null);
  const pendingSeconds = useRef(0);
  const completedRef = useRef(props.completed);
  const inFlight = useRef(false);
  const retried = useRef(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const collectSeconds = () => {
    if (playingSince.current !== null) {
      pendingSeconds.current += (performance.now() - playingSince.current) / 1000;
      playingSince.current = performance.now();
    }
    const s = pendingSeconds.current;
    pendingSeconds.current = 0;
    return s;
  };

  const payload = useCallback(() => {
    const v = videoRef.current;
    if (!v) return null;
    return {
      lessonId,
      position: Math.floor(v.currentTime),
      watchPct: Math.round(coveragePct(v, priorEnd.current) * 100) / 100,
      delta: Math.min(600, Math.round(collectSeconds())),
    };
  }, [lessonId]);

  const onCompleted = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setCompleted(true);
    notify.success("Lesson complete", {
      description: "Your progress is saved.",
      action: nextHref ? { label: "Next lesson", onClick: () => router.push(nextHref) } : undefined,
    });
    router.refresh();
  }, [nextHref, router]);

  const beat = useCallback(
    async (useBeacon = false) => {
      const body = payload();
      if (!body) return;
      if (useBeacon && typeof navigator.sendBeacon === "function") {
        navigator.sendBeacon("/api/progress", new Blob([JSON.stringify(body)], { type: "text/plain" }));
        return;
      }
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const res = await fetch("/api/progress", { method: "POST", body: JSON.stringify(body), keepalive: true });
        if (res.ok) {
          const json = (await res.json()) as { watchPct: number; justCompleted: boolean; status: string };
          setWatchPct((w) => Math.max(w, json.watchPct));
          if (json.justCompleted || json.status === "completed") onCompleted();
        }
      } catch {
        // Offline: the next heartbeat carries the accumulated time.
      } finally {
        inFlight.current = false;
      }
    },
    [payload, onCompleted],
  );

  // Heartbeat while playing.
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => void beat(), BEAT_MS);
    return () => clearInterval(t);
  }, [playing, beat]);

  // Flush when the tab is hidden or the page unloads.
  useEffect(() => {
    const flush = () => document.visibilityState === "hidden" && void beat(true);
    const leave = () => void beat(true);
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", leave);
    return () => {
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", leave);
      void beat(true);
    };
  }, [beat]);

  useEffect(() => {
    // Feature-detect after hydration so server and client markup match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPipSupported("pictureInPictureEnabled" in document && document.pictureInPictureEnabled);
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setControlsVisible(false);
    }, 2600);
  }, []);

  const metaApplied = useRef(false);
  const applyMetadata = useCallback(
    (v: HTMLVideoElement) => {
      if (metaApplied.current || !Number.isFinite(v.duration)) return;
      metaApplied.current = true;
      setDuration(v.duration);
      priorEnd.current = (initialWatchPct / 100) * v.duration;
      if (startAt > 3 && startAt < v.duration - 5) v.currentTime = startAt;
    },
    [initialWatchPct, startAt],
  );

  // Metadata can arrive before hydration, in which case onLoadedMetadata never fires.
  useEffect(() => {
    const v = videoRef.current;
    if (v && v.readyState >= 1) applyMetadata(v);
  }, [applyMetadata]);

  const toggle = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused || v.ended) void v.play();
    else v.pause();
  }, []);

  const seekBy = (s: number) => {
    const v = videoRef.current;
    if (v) v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + s));
    showControls();
  };

  const toggleFullscreen = async () => {
    const v = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (wrapRef.current?.requestFullscreen) await wrapRef.current.requestFullscreen();
    else v?.webkitEnterFullscreen?.();
  };

  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key.toLowerCase();
    const v = videoRef.current;
    if (!v) return;
    if (k === " " || k === "k") {
      e.preventDefault();
      toggle();
    } else if (k === "arrowright" || k === "l") {
      e.preventDefault();
      seekBy(k === "l" ? 10 : 5);
    } else if (k === "arrowleft" || k === "j") {
      e.preventDefault();
      seekBy(k === "j" ? -10 : -5);
    } else if (k === "m") {
      v.muted = !v.muted;
    } else if (k === "f") {
      void toggleFullscreen();
    }
  };

  const refreshSource = async () => {
    if (retried.current) return;
    retried.current = true;
    const at = videoRef.current?.currentTime ?? 0;
    const res = await fetch(`/api/media/lesson/${lessonId}?kind=video`);
    if (!res.ok) return notify.error("This video could not be loaded", { description: "Refresh the page to try again." });
    const { url } = (await res.json()) as { url: string };
    setSrc(url);
    requestAnimationFrame(() => {
      if (videoRef.current) videoRef.current.currentTime = at;
    });
  };

  const pct = duration ? (time / duration) * 100 : 0;
  const needed = Math.max(0, requiredPct - watchPct);

  return (
    <div>
      <div
        ref={wrapRef}
        tabIndex={0}
        role="region"
        aria-label={`Video player: ${title}`}
        onKeyDown={onKey}
        onPointerMove={showControls}
        onPointerDown={showControls}
        className={cn(
          "group/player relative aspect-video w-full overflow-hidden bg-black select-none md:rounded-lg",
          fullscreen && "md:rounded-none",
          !controlsVisible && playing && "cursor-none",
        )}
      >
        <video
          ref={videoRef}
          src={src}
          poster={poster ?? undefined}
          playsInline
          preload="metadata"
          className="absolute inset-0 size-full object-contain"
          onClick={toggle}
          onLoadedMetadata={(e) => applyMetadata(e.currentTarget)}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            setTime(v.currentTime);
            const cov = coveragePct(v, priorEnd.current);
            setWatchPct((w) => Math.max(w, cov));
            if (!completedRef.current && cov >= requiredPct) void beat();
          }}
          onProgress={(e) => {
            const v = e.currentTarget;
            if (v.buffered.length) setBuffered((v.buffered.end(v.buffered.length - 1) / (v.duration || 1)) * 100);
          }}
          onPlay={() => {
            setStarted(true);
            setPlaying(true);
            setEnded(false);
            playingSince.current = performance.now();
            showControls();
          }}
          onPause={() => {
            collectSeconds();
            playingSince.current = null;
            setPlaying(false);
            setControlsVisible(true);
            void beat();
          }}
          onEnded={() => {
            setEnded(true);
            void beat();
          }}
          onRateChange={(e) => setRate(e.currentTarget.playbackRate)}
          onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
          onError={() => void refreshSource()}
        />

        {/* Veil under the controls (branding: inset stone veil, never a flat black scrim) */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 shadow-media transition-opacity duration-200 ease-standard",
            controlsVisible || !playing ? "opacity-100" : "opacity-0",
          )}
        />

        {/* Centre play / replay */}
        {!playing ? (
          <button
            type="button"
            onClick={() => {
              if (ended && videoRef.current) videoRef.current.currentTime = 0;
              toggle();
            }}
            aria-label={ended ? "Replay" : started ? "Play" : `Play ${title}`}
            className="absolute top-1/2 left-1/2 grid size-[72px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-pill bg-primary text-white shadow-raised transition-[background-color,transform] duration-120 ease-standard hover:bg-primary-hover active:translate-y-[calc(-50%+1px)] md:size-20"
          >
            {ended ? <RotateCcw aria-hidden className="size-8 stroke-[2]" /> : <Play aria-hidden className="ml-1 size-8 fill-current stroke-[1.5]" />}
          </button>
        ) : null}

        {!started && startAt > 3 ? (
          <p className="absolute top-4 left-4 rounded-md bg-inverse px-3 py-1.5 font-ui text-[13px] font-semibold text-cloudy">
            Resumes at {formatClock(startAt)}
          </p>
        ) : null}

        {/* Controls */}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 px-3 pt-6 pb-2 transition-opacity duration-200 ease-standard md:px-4 md:pb-3",
            controlsVisible || !playing ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <Scrubber
            value={pct}
            buffered={buffered}
            watched={duration ? Math.min(100, watchPct) : 0}
            duration={duration}
            onSeek={(p) => {
              const v = videoRef.current;
              if (v && duration) v.currentTime = (p / 100) * duration;
            }}
          />
          <div className="mt-1.5 flex items-center gap-1 text-cloudy">
            <CtrlButton label={playing ? "Pause" : "Play"} onClick={toggle}>
              {playing ? <Pause aria-hidden className="fill-current" /> : <Play aria-hidden className="fill-current" />}
            </CtrlButton>
            <CtrlButton label={muted ? "Unmute" : "Mute"} onClick={() => videoRef.current && (videoRef.current.muted = !muted)}>
              {muted ? <VolumeX aria-hidden /> : <Volume2 aria-hidden />}
            </CtrlButton>
            <span className="ml-1 font-ui text-[13px] font-semibold tabular-nums">
              {formatClock(time)} <span className="text-cloudy/70">/ {formatClock(duration)}</span>
            </span>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => {
                const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
                if (videoRef.current) videoRef.current.playbackRate = next;
              }}
              aria-label={`Playback speed ${rate}x`}
              className="h-9 min-w-12 rounded-md px-2 font-ui text-[13px] font-semibold transition-colors duration-120 hover:bg-white/15"
            >
              {rate}x
            </button>
            {pipSupported ? (
              <CtrlButton
                label="Picture in picture"
                className="hidden md:grid"
                onClick={() => {
                  const v = videoRef.current;
                  if (!v) return;
                  if (document.pictureInPictureElement) void document.exitPictureInPicture();
                  else void v.requestPictureInPicture?.();
                }}
              >
                <PictureInPicture2 aria-hidden />
              </CtrlButton>
            ) : null}
            <CtrlButton label={fullscreen ? "Exit full screen" : "Full screen"} onClick={() => void toggleFullscreen()}>
              {fullscreen ? <Minimize aria-hidden /> : <Maximize aria-hidden />}
            </CtrlButton>
          </div>
        </div>
      </div>

      {/* Completion rule */}
      <div className="mt-3 flex items-center gap-3 px-4 md:px-0" aria-live="polite">
        {completed ? (
          <p className="flex items-center gap-2 font-ui text-[14px] font-semibold text-olive">
            <span className="grid size-5 place-items-center rounded-pill bg-olive text-white">
              <Check aria-hidden className="size-3.5 stroke-[3]" />
            </span>
            Lesson complete
          </p>
        ) : (
          <>
            <div className="h-1.5 w-28 overflow-hidden rounded-pill bg-black/10" aria-hidden>
              <div className="h-full rounded-pill bg-primary transition-[width] duration-[340ms] ease-standard" style={{ width: `${Math.min(100, (watchPct / requiredPct) * 100)}%` }} />
            </div>
            <p className="text-[14px] text-muted">
              Watched {Math.floor(watchPct)}% · watch {requiredPct}% to complete
              {needed > 0 && duration ? ` (${formatClock((needed / 100) * duration)} to go)` : ""}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function CtrlButton({
  label,
  onClick,
  children,
  className,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid size-10 place-items-center rounded-md transition-colors duration-120 ease-standard hover:bg-white/15 [&_svg]:size-5 [&_svg]:stroke-[1.75]",
        className,
      )}
    >
      {children}
    </button>
  );
}

function Scrubber({
  value,
  buffered,
  watched,
  duration,
  onSeek,
}: {
  value: number;
  buffered: number;
  watched: number;
  duration: number;
  onSeek: (pct: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const pctAt = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    return Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
  };

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={-1}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round((value / 100) * duration)}
      aria-valuetext={`${formatClock((value / 100) * duration)} of ${formatClock(duration)}`}
      className="group/scrub relative flex h-5 cursor-pointer items-center touch-none"
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        setDragging(true);
        onSeek(pctAt(e.clientX));
      }}
      onPointerMove={(e) => {
        setHover(pctAt(e.clientX));
        if (dragging) onSeek(pctAt(e.clientX));
      }}
      onPointerUp={() => setDragging(false)}
      onPointerLeave={() => setHover(null)}
    >
      <div className="relative h-1 w-full overflow-hidden rounded-pill bg-white/25 transition-[height] duration-120 group-hover/scrub:h-1.5">
        <div className="absolute inset-y-0 left-0 bg-white/35" style={{ width: `${buffered}%` }} />
        <div className="absolute inset-y-0 left-0 bg-white/55" style={{ width: `${watched}%` }} />
        <div className="absolute inset-y-0 left-0 bg-toucan" style={{ width: `${value}%` }} />
      </div>
      <div
        className="absolute size-3.5 -translate-x-1/2 rounded-pill bg-toucan shadow-sticker transition-transform duration-120 group-hover/scrub:scale-110"
        style={{ left: `${value}%` }}
      />
      {hover !== null && duration ? (
        <span
          className="absolute -top-8 -translate-x-1/2 rounded-md bg-inverse px-2 py-1 font-ui text-[12px] font-semibold text-cloudy tabular-nums"
          style={{ left: `${hover}%` }}
        >
          {formatClock((hover / 100) * duration)}
        </span>
      ) : null}
    </div>
  );
}
