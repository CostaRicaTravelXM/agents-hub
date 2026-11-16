"use client";

/*
 * The Thanksgiving gift screen: two layers of video and nothing else.
 *  - back: the beach loop, covering the screen;
 *  - front: the gift, transparent, which opens once and then idles in a loop.
 * The "Claim your gift" button is drawn inside the front video, so a real,
 * invisible button sits exactly over it.
 *
 * Chrome, Android and Firefox play the designer's WebM files, which carry their
 * own transparency. Safari and every iPhone browser ignore WebM transparency, so
 * they get an MP4 with the picture on the top half and its mask on the bottom
 * half, put back together on a canvas. `?alpha=canvas` forces that path anywhere.
 */
import * as React from "react";
import Image from "next/image";
import { ClaimSheet, type SpotlightTrip } from "@/components/thanksgiving/claim-sheet";
import type { HubAccess } from "@/lib/campaigns/thanksgiving";
import { cn } from "@/lib/utils";

type Orientation = "vertical" | "horizontal";
type AlphaMode = "native" | "canvas";

/** Where the drawn button sits inside the gift video, in percent of its box. */
const HIT: Record<Orientation, React.CSSProperties> = {
  vertical: { left: "14.5%", top: "66.8%", width: "71%", height: "9.6%" },
  horizontal: { left: "32.6%", top: "70%", width: "34.8%", height: "13.8%" },
};
const RATIO: Record<Orientation, number> = { vertical: 9 / 16, horizontal: 16 / 9 };

/**
 * The gift video carries a tint and leaves across its whole frame, so it has to
 * cover the screen like the background does, or its edges show as a seam.
 * Covering crops whichever way the screen is narrower than the video. `side` and
 * `tall` cap that crop so the logo and the button are never cut; past the cap
 * (a very unusual screen) the frame stops growing and a band of background shows.
 */
const MAX_CROP: Record<Orientation, { side: number; tall: number }> = {
  vertical: { side: 1.34, tall: 1.4 },
  horizontal: { side: 1.5, tall: 1.25 },
};

function coverWidth(orientation: Orientation) {
  const ratio = RATIO[orientation];
  const { side, tall } = MAX_CROP[orientation];
  return `min(max(100vw, calc(100dvh * ${ratio})), calc(100vw * ${side}), calc(100dvh * ${ratio * tall}))`;
}

const noop = () => () => {};

function useMediaQuery(query: string): boolean | null {
  return React.useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => null,
  );
}

function detectAlphaMode(): AlphaMode {
  const forced = new URLSearchParams(window.location.search).get("alpha");
  if (forced === "canvas" || forced === "native") return forced;
  // Every browser on iPhone and iPad is WebKit, and so is Safari on a Mac.
  return /Apple/.test(navigator.vendor) ? "canvas" : "native";
}

export function GiftStage({
  channel,
  unlocked,
  hub,
  turnstileSiteKey,
  trips,
}: {
  channel: string;
  unlocked: boolean;
  hub?: HubAccess;
  turnstileSiteKey?: string;
  trips: SpotlightTrip[];
}) {
  const portrait = useMediaQuery("(orientation: portrait)");
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const alpha = React.useSyncExternalStore(noop, detectAlphaMode, () => null);
  const mounted = portrait !== null && alpha !== null;
  const orientation: Orientation = portrait === false ? "horizontal" : "vertical";

  // The orientation whose video failed or was refused (iPhone Low Power Mode blocks autoplay).
  const [failed, setFailed] = React.useState(false);
  const [looping, setLooping] = React.useState<Orientation | null>(null);
  const [open, setOpen] = React.useState(false);

  const still = Boolean(reducedMotion) || failed;
  const ready = mounted && (still || looping === orientation);
  const onLoop = React.useCallback(() => setLooping(orientation), [orientation]);
  const onFail = React.useCallback(() => setFailed(true), []);

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#e9b071] bg-[url(/thanksgiving/bg-vertical.jpg)] bg-cover bg-center landscape:bg-[url(/thanksgiving/bg-horizontal.jpg)]">
      <h1 className="sr-only">Happy Thanksgiving from TravelXM</h1>

      {mounted && !still ? <Background key={orientation} orientation={orientation} /> : null}

      {/* Centred by position, not by a grid: the frame is wider than a phone screen, and a grid would pin it to the left edge. */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ aspectRatio: RATIO[orientation], width: coverWidth(orientation) }}
          data-gift={ready ? "ready" : "opening"}
        >
          {!mounted ? null : still ? (
            <Image src={`/thanksgiving/still-${orientation}.webp`} alt="" fill unoptimized priority className="object-contain" />
          ) : alpha === "canvas" ? (
            <CanvasGift key={orientation} orientation={orientation} onLoop={onLoop} onFail={onFail} />
          ) : (
            <NativeGift key={orientation} orientation={orientation} onLoop={onLoop} onFail={onFail} />
          )}

          <button
            type="button"
            disabled={!ready}
            onClick={() => setOpen(true)}
            aria-label="Claim your gift"
            style={HIT[orientation]}
            className="absolute cursor-pointer rounded-pill outline-none focus-visible:shadow-[0_0_0_3px_#fff,0_0_0_6px_var(--xm-ink)] disabled:cursor-default"
          />
        </div>
      </div>

      <ClaimSheet open={open} onOpenChange={setOpen} channel={channel} unlocked={unlocked} hub={hub} turnstileSiteKey={turnstileSiteKey} trips={trips} />
    </main>
  );
}

function Background({ orientation }: { orientation: Orientation }) {
  const ref = React.useRef<HTMLVideoElement>(null);
  React.useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    // A refused autoplay just leaves the poster showing.
    v.play().catch(() => {});
  }, []);
  return (
    <video
      ref={ref}
      src={`/thanksgiving/bg-${orientation}.mp4`}
      poster={`/thanksgiving/bg-${orientation}.jpg`}
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden
      tabIndex={-1}
      className="pointer-events-none absolute inset-0 size-full object-cover"
    />
  );
}

type GiftProps = { orientation: Orientation; onLoop: () => void; onFail: () => void };

/** Starts the opening clip, then hands over to the loop without a gap. */
function useOpenThenLoop({ onLoop, onFail }: Pick<GiftProps, "onLoop" | "onFail">) {
  const openRef = React.useRef<HTMLVideoElement>(null);
  const loopRef = React.useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = React.useState<"open" | "loop">("open");

  React.useEffect(() => {
    const v = openRef.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(onFail);
  }, [onFail]);

  const startLoop = React.useCallback(() => {
    const v = loopRef.current;
    if (!v) return;
    v.muted = true;
    v.play()
      .then(() => {
        setPhase("loop");
        onLoop();
      })
      .catch(onFail);
  }, [onLoop, onFail]);

  return { openRef, loopRef, phase, startLoop };
}

function NativeGift({ orientation, onLoop, onFail }: GiftProps) {
  const { openRef, loopRef, phase, startLoop } = useOpenThenLoop({ onLoop, onFail });
  const layer = "pointer-events-none absolute inset-0 size-full object-contain";
  return (
    <>
      <video
        ref={openRef}
        src={`/thanksgiving/open-${orientation}.webm`}
        muted
        playsInline
        preload="auto"
        aria-hidden
        tabIndex={-1}
        onEnded={startLoop}
        onError={onFail}
        className={cn(layer, phase !== "open" && "invisible")}
      />
      <video
        ref={loopRef}
        src={`/thanksgiving/loop-${orientation}.webm`}
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden
        tabIndex={-1}
        onError={onFail}
        className={cn(layer, phase !== "loop" && "invisible")}
      />
    </>
  );
}

const VERTEX = `
attribute vec2 p;
varying vec2 uv;
void main() {
  uv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}`;

// Top half of the frame is the picture, bottom half is its mask (white = solid).
const FRAGMENT = `
precision mediump float;
uniform sampler2D frame;
varying vec2 uv;
void main() {
  float y = clamp((1.0 - uv.y) * 0.5, 0.002, 0.498);
  vec3 color = texture2D(frame, vec2(uv.x, y)).rgb;
  float alpha = texture2D(frame, vec2(uv.x, y + 0.5)).r;
  gl_FragColor = vec4(color * alpha, alpha);
}`;

function CanvasGift({ orientation, onLoop, onFail }: GiftProps) {
  const { openRef, loopRef, phase, startLoop } = useOpenThenLoop({ onLoop, onFail });
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const phaseRef = React.useRef(phase);
  React.useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!canvas || !gl) {
      onFail();
      return;
    }
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      onFail();
      return;
    }
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const p = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(p);
    gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.clearColor(0, 0, 0, 0);

    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const video = phaseRef.current === "open" ? openRef.current : loopRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth) return;
      const w = video.videoWidth;
      const h = video.videoHeight / 2;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      } catch {
        return;
      }
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [onFail, openRef, loopRef]);

  // Kept in the page (not display:none) so iPhone keeps decoding them.
  const hidden = "pointer-events-none absolute top-0 left-0 size-px opacity-0";
  return (
    <>
      <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 size-full" />
      <video ref={openRef} src={`/thanksgiving/open-${orientation}-stacked.mp4`} muted playsInline preload="auto" aria-hidden tabIndex={-1} onEnded={startLoop} onError={onFail} className={hidden} />
      <video ref={loopRef} src={`/thanksgiving/loop-${orientation}-stacked.mp4`} muted loop playsInline preload="auto" aria-hidden tabIndex={-1} onError={onFail} className={hidden} />
    </>
  );
}
