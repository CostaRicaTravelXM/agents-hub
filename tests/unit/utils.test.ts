import { describe, expect, it } from "vitest";
import { formatClock, formatCompactDuration, formatDuration, initials, safeNext, slugify } from "@/lib/utils";
import { nextLesson, type OutlineModule } from "@/lib/course";

describe("formatting", () => {
  it("formats durations for lessons and totals", () => {
    expect(formatDuration(40)).toBe("40 s");
    expect(formatDuration(6 * 60)).toBe("6 min");
    expect(formatDuration(125 * 60)).toBe("2 h 05 min");
    expect(formatCompactDuration(8400)).toBe("2h 20m");
    expect(formatClock(3725)).toBe("1:02:05");
  });

  it("builds slugs without accents", () => {
    expect(slugify("Poás & the Central Valley")).toBe("poas-the-central-valley");
  });

  it("makes initials", () => {
    expect(initials("Sofía Ramírez")).toBe("SR");
    expect(initials(null)).toBe("XM");
  });
});

describe("safeNext", () => {
  it("only allows same-origin relative paths", () => {
    expect(safeNext("/courses/x")).toBe("/courses/x");
    expect(safeNext("//evil.com")).toBe("/dashboard");
    expect(safeNext("/\\evil.com")).toBe("/dashboard");
    expect(safeNext("https://evil.com")).toBe("/dashboard");
    expect(safeNext(null)).toBe("/dashboard");
  });
});

describe("nextLesson", () => {
  const lesson = (id: string, status: "not_started" | "in_progress" | "completed") => ({
    id,
    title: id,
    type: "video" as const,
    duration_seconds: 60,
    sort_order: 0,
    is_required: true,
    summary: null,
    module_id: "m",
    status,
    watch_pct: 0,
  });
  const mod = (id: string, unlocked: boolean, lessons: ReturnType<typeof lesson>[]): OutlineModule => ({
    id,
    title: id,
    description: null,
    sort_order: 0,
    unlocked,
    completed: false,
    missing: [],
    lessons,
  });

  it("returns the first incomplete lesson in an unlocked module", () => {
    const modules = [mod("m1", true, [lesson("a", "completed"), lesson("b", "in_progress")]), mod("m2", false, [lesson("c", "not_started")])];
    expect(nextLesson(modules)?.id).toBe("b");
  });

  it("never points into a locked module", () => {
    const modules = [mod("m1", true, [lesson("a", "completed")]), mod("m2", false, [lesson("c", "not_started")])];
    expect(nextLesson(modules, "a")?.id).toBe("a");
  });
});
