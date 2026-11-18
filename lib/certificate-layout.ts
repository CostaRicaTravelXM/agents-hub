/**
 * Geometry of the certificate design (Canva, A4 landscape at 96 px per inch).
 * The background art carries everything that never changes, "This certifies that:" and
 * "Has completed" included; these are the spots the per-advisor text goes into.
 * Values are Canva pixels; the PDF converts them to points.
 */
export const CERT = {
  width: 1123,
  height: 794,
  /** Black of the design's body text. */
  ink: "#0d0d0d",
  paper: "#ffffff",
  nameColor: "#3f3f7a",
  courseColor: "#f41f16",
  centerX: 561.5,
  /** Widest a name or course title may run: a little wider than the body sentence. */
  maxTextWidth: 780,
  /** Between "This certifies that:" (bottom 413) and "Has completed" (top 468). */
  name: { centerY: 430, size: 29.27, minSize: 20 },
  /** Between "Has completed" (bottom 490) and the body line (top 545). */
  course: { centerY: 517, size: 29.27, minSize: 22, twoLineSize: 22, minTwoLineSize: 16, lineHeight: 1.05 },
  footer: { labelCenterY: 678, valueCenterY: 696, labelSize: 10, valueSize: 13.33, labelTracking: 0.175 },
  /** The empty corners of the card, either side of the Costa Rica map and the signature. */
  issuedCenterX: 208,
  verifyCenterX: 915,
  qr: { size: 84, bottom: 666 },
} as const;

/** Width of `text` at `size`, in the same unit as `size`. */
export type Measure = (text: string, size: number) => number;

/** Largest size up to `max` at which `text` fits `width`, never below `min`. */
export function fitSize(text: string, measure: Measure, width: number, max: number, min: number) {
  const atMax = measure(text, max);
  if (atMax <= width) return max;
  return Math.max(min, (max * width) / atMax);
}

/** Two lines with the most even widths, or null when there is only one word. */
export function splitInTwo(text: string, measure: Measure, size: number): [string, string] | null {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 2) return null;
  let best: [string, string] = [words[0], words.slice(1).join(" ")];
  let bestWidth = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ");
    const b = words.slice(i).join(" ");
    const widest = Math.max(measure(a, size), measure(b, size));
    if (widest < bestWidth) {
      bestWidth = widest;
      best = [a, b];
    }
  }
  return best;
}

/**
 * The course title stays on one line while it fits at a readable size. A title too long
 * for that breaks into two balanced lines, which still clear the body line below.
 */
export function layoutCourse(title: string, measure: Measure) {
  const { size, minSize, twoLineSize, minTwoLineSize } = CERT.course;
  const width = CERT.maxTextWidth;
  if (measure(title, minSize) <= width) {
    return { lines: [title], size: fitSize(title, measure, width, size, minSize) };
  }
  const split = splitInTwo(title, measure, twoLineSize);
  if (!split) return { lines: [title], size: fitSize(title, measure, width, size, 1) };
  const twoLine = Math.min(
    fitSize(split[0], measure, width, twoLineSize, minTwoLineSize),
    fitSize(split[1], measure, width, twoLineSize, minTwoLineSize),
  );
  return { lines: split, size: twoLine };
}
