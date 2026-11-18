import { describe, expect, it } from "vitest";
import QRCode from "qrcode";
import { certificateVerifyUrl } from "@/lib/certificate-url";
import { CERT, fitSize, layoutCourse, splitInTwo, type Measure } from "@/lib/certificate-layout";

// One unit per character per point of size: easy widths to reason about.
const perChar: Measure = (text, size) => text.length * size;

describe("certificate text fitting", () => {
  it("keeps the design size when the text already fits", () => {
    expect(fitSize("Ana", perChar, 760, 50, 26)).toBe(50);
  });

  it("shrinks a long name just enough to fit the width", () => {
    expect(fitSize("x".repeat(20), perChar, 760, 50, 26)).toBe(38);
  });

  it("never shrinks below the minimum", () => {
    expect(fitSize("x".repeat(100), perChar, 760, 50, 26)).toBe(26);
  });

  it("splits into the two most even lines", () => {
    expect(splitInTwo("Destination Weddings & Honeymoons", perChar, 10)).toEqual(["Destination Weddings", "& Honeymoons"]);
    expect(splitInTwo("Single", perChar, 10)).toBeNull();
  });

  it("keeps a course title that fits at a readable size on one line", () => {
    const title = "x".repeat(30); // 780 wide at 26
    const course = layoutCourse(title, perChar);
    expect(course.lines).toEqual([title]);
    expect(course.size).toBeCloseTo(26);
  });

  it("breaks a course title onto two lines rather than shrinking it to nothing", () => {
    const course = layoutCourse("WELLNESS TRANSFORMATIONAL AND REGENERATIVE TRAVEL", perChar);
    expect(course.lines).toHaveLength(2);
    expect(course.size).toBeGreaterThanOrEqual(CERT.course.minTwoLineSize);
    for (const line of course.lines) expect(perChar(line, course.size)).toBeLessThanOrEqual(CERT.maxTextWidth + 0.001);
  });

  it("two lines of the title stay between \"Has completed\" and the body line", () => {
    const course = layoutCourse("A VERY LONG COURSE TITLE THAT NEEDS TWO LINES TO FIT", perChar);
    const half = (course.size * CERT.course.lineHeight * course.lines.length) / 2;
    expect(CERT.course.centerY - half).toBeGreaterThan(490);
    expect(CERT.course.centerY + half).toBeLessThan(545);
  });
});

describe("certificate verify link", () => {
  it("keeps the scheme, so a phone camera opens it as a link", () => {
    expect(certificateVerifyUrl("https://hub.travelxm.com", "TXM-2026-V3JWHK")).toBe("https://hub.travelxm.com/verify/TXM-2026-V3JWHK");
  });

  it("does not double the slash when the app address ends with one", () => {
    expect(certificateVerifyUrl("https://hub.travelxm.com/", "TXM-2026-V3JWHK")).toBe("https://hub.travelxm.com/verify/TXM-2026-V3JWHK");
  });

  it("fits a QR code small enough for the certificate footer", () => {
    const qr = QRCode.create(certificateVerifyUrl("https://hub.travelxm.com", "TXM-2026-V3JWHK"), { errorCorrectionLevel: "M" });
    // Version 3 is 29 modules across: about 2.2 pt per module at 64 pt, comfortable for a phone camera.
    expect(qr.version).toBeLessThanOrEqual(4);
  });
});
