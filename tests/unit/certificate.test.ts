import { describe, expect, it } from "vitest";
import QRCode from "qrcode";
import { certificateVerifyUrl } from "@/lib/certificate-url";

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
