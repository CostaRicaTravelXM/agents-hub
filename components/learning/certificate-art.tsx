import Image from "next/image";
import QRCode from "qrcode";
import { CERT, fitSize, layoutCourse, type Measure } from "@/lib/certificate-layout";
import { cn } from "@/lib/utils";

/*
 * The certificate face, drawn like the PDF: the Canva art as the background and the
 * advisor's details placed on it. Sizes scale with the card (cqw), so it reads the same
 * from a phone to a desktop column.
 */

// No font metrics in the browser bundle: generous per-character widths, so text never overruns.
const measureCourse: Measure = (text, size) => text.length * size * 0.75;
const measureName: Measure = (text, size) => text.length * size * 0.55;

const cqw = (px: number) => `${(px / CERT.width) * 100}cqw`;
const x = (px: number) => `${(px / CERT.width) * 100}%`;
const y = (px: number) => `${(px / CERT.height) * 100}%`;

function QrSvg({ url }: { url: string }) {
  const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.modules.get(r, c)) d += `M${c + 1} ${r + 1}h1v1h-1z`;
  return (
    <svg viewBox={`0 0 ${n + 2} ${n + 2}`} shapeRendering="crispEdges" aria-hidden className="size-full">
      <rect width={n + 2} height={n + 2} fill={CERT.paper} />
      <path d={d} fill={CERT.ink} />
    </svg>
  );
}

function FooterColumn({ centerX, label, value }: { centerX: number; label: string; value: string }) {
  const { footer } = CERT;
  return (
    <>
      <p
        className="absolute w-max -translate-1/2 font-certificate font-bold whitespace-nowrap uppercase"
        style={{ left: x(centerX), top: y(footer.labelCenterY), fontSize: cqw(footer.labelSize), letterSpacing: `${footer.labelTracking}em` }}
      >
        {label}
      </p>
      <p
        className="absolute w-max -translate-1/2 font-certificate font-medium whitespace-nowrap"
        style={{ left: x(centerX), top: y(footer.valueCenterY), fontSize: cqw(footer.valueSize) }}
      >
        {value}
      </p>
    </>
  );
}

export function CertificateArt({
  name,
  courseTitle,
  issued,
  code,
  verifyUrl,
  titleAs: Title = "p",
  className,
}: {
  name: string;
  courseTitle: string;
  /** Shown under "Issued": the date, or a note on the sample. */
  issued: string;
  code?: string;
  /** Full verify URL. When present the QR code is drawn, as on the PDF. */
  verifyUrl?: string;
  titleAs?: "p" | "h2" | "h3";
  className?: string;
}) {
  const nameSize = fitSize(name, measureName, CERT.maxTextWidth, CERT.name.size, CERT.name.minSize);
  const course = layoutCourse(courseTitle.toUpperCase(), measureCourse);
  const centered = "absolute inset-x-0 -translate-y-1/2 text-center";

  return (
    <div
      className={cn("@container relative aspect-[1123/794] overflow-hidden", className)}
      style={{ backgroundColor: CERT.paper, color: CERT.ink }}
    >
      <Image src="/brand/certificate-background.webp" alt="" fill sizes="(min-width: 768px) 560px, 100vw" className="object-cover" />
      <p className="sr-only">This certifies that</p>
      <p
        className={cn(centered, "font-serif leading-tight font-bold whitespace-nowrap")}
        style={{ top: y(CERT.name.centerY), fontSize: cqw(nameSize), color: CERT.nameColor }}
      >
        {name}
      </p>
      <p className="sr-only">has completed</p>
      <Title
        className={cn(centered, "font-serif font-bold whitespace-nowrap uppercase")}
        style={{ top: y(CERT.course.centerY), fontSize: cqw(course.size), lineHeight: CERT.course.lineHeight, color: CERT.courseColor }}
      >
        {course.lines.map((line, i) => (
          <span key={i} className="block">
            {line}
          </span>
        ))}
      </Title>
      <p className="sr-only">and is recognized by TravelXM as a travel advisor trained to plan and sell this program.</p>

      <FooterColumn centerX={CERT.issuedCenterX} label="Issued" value={issued} />
      {code ? (
        <>
          {verifyUrl ? (
            <div
              className="absolute"
              style={{
                left: x(CERT.verifyCenterX - CERT.qr.size / 2),
                top: y(CERT.qr.bottom - CERT.qr.size),
                width: x(CERT.qr.size),
                height: y(CERT.qr.size),
              }}
            >
              <QrSvg url={verifyUrl} />
            </div>
          ) : null}
          <FooterColumn centerX={CERT.verifyCenterX} label="Scan to verify" value={code} />
        </>
      ) : null}
    </div>
  );
}
