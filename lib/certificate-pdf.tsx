import "server-only";
import path from "node:path";
import { readFileSync } from "node:fs";
import { Document, Font, Image, Page, StyleSheet, Text, renderToBuffer } from "@react-pdf/renderer";
import { openSync } from "fontkit";
import QRCode from "qrcode";
import { CERT, fitSize, layoutCourse, type Measure } from "@/lib/certificate-layout";

const root = process.cwd();
const fontPath = (name: string) => path.join(root, "assets/fonts", name);
const FONTS = {
  playfair: fontPath("PlayfairDisplay-Bold.ttf"),
  medium: fontPath("Montserrat-Medium.ttf"),
  bold: fontPath("Montserrat-Bold.ttf"),
};

let registered = false;
function registerFonts() {
  if (registered) return;
  registered = true;
  Font.register({ family: "Playfair", src: FONTS.playfair, fontWeight: 700 });
  Font.register({
    family: "Montserrat",
    fonts: [
      { src: FONTS.medium, fontWeight: 500 },
      { src: FONTS.bold, fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
}

const measurers = new Map<string, Measure>();
function measurer(file: string): Measure {
  let m = measurers.get(file);
  if (!m) {
    const font = openSync(file);
    m = (text, size) => (font.layout(text).advanceWidth / font.unitsPerEm) * size;
    measurers.set(file, m);
  }
  return m;
}

/** Canva pixels to PDF points: the design is 1123 × 794 px, A4 landscape is 841.89 × 595.28 pt. */
const pt = (px: number) => (px * 841.89) / CERT.width;
const LINE = 1.2;

/** A one-line box whose text is centred on (centerX, centerY), all in Canva pixels. */
function centered(centerY: number, size: number, lines = 1, lineHeight = LINE, centerX: number = CERT.centerX, width = 900) {
  return {
    position: "absolute" as const,
    left: pt(centerX - width / 2),
    width: pt(width),
    top: pt(centerY - (size * lineHeight * lines) / 2),
    textAlign: "center" as const,
    lineHeight,
  };
}

const s = StyleSheet.create({
  page: { backgroundColor: CERT.paper, color: CERT.ink, fontFamily: "Montserrat" },
  background: { position: "absolute", top: 0, left: 0, width: pt(CERT.width), height: pt(CERT.height) },
  serif: { fontFamily: "Playfair", fontWeight: 700 },
  label: { fontSize: pt(CERT.footer.labelSize), fontWeight: 700, letterSpacing: pt(CERT.footer.labelSize * CERT.footer.labelTracking) },
  value: { fontSize: pt(CERT.footer.valueSize), fontWeight: 500 },
});

/** The verify page as a QR code, in the certificate's ink on its paper, with a one-module quiet zone. */
function qrPng(url: string) {
  return QRCode.toDataURL(url, { margin: 1, width: 444, errorCorrectionLevel: "M", color: { dark: CERT.ink, light: CERT.paper } });
}

export async function renderCertificate(opts: {
  recipient: string;
  course: string;
  code: string;
  issuedAt: string;
  /** Full URL of the public verify page, scheme included: it goes into the QR code. */
  verifyUrl: string;
}) {
  registerFonts();
  const qr = await qrPng(opts.verifyUrl);
  const background = { data: readFileSync(path.join(root, "assets/certificate/background.jpg")), format: "jpg" as const };
  const issued = new Date(opts.issuedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const nameSize = fitSize(opts.recipient, measurer(FONTS.playfair), CERT.maxTextWidth, CERT.name.size, CERT.name.minSize);
  const courseTitle = opts.course.toUpperCase();
  const course = layoutCourse(courseTitle, measurer(FONTS.playfair));
  const { footer, qr: qrBox } = CERT;

  const doc = (
    <Document title={`${opts.course} · ${opts.recipient}`} author="TravelXM Academy" subject="Certificate of completion">
      <Page size="A4" orientation="landscape" style={s.page}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image src={background} style={s.background} fixed />

        <Text style={[s.serif, { fontSize: pt(nameSize), color: CERT.nameColor }, centered(CERT.name.centerY, nameSize)]}>
          {opts.recipient}
        </Text>
        <Text
          style={[
            s.serif,
            { fontSize: pt(course.size), color: CERT.courseColor },
            centered(CERT.course.centerY, course.size, course.lines.length, CERT.course.lineHeight),
          ]}
        >
          {course.lines.join("\n")}
        </Text>

        <Text style={[s.label, centered(footer.labelCenterY, footer.labelSize, 1, LINE, CERT.issuedCenterX, 240)]}>ISSUED</Text>
        <Text style={[s.value, centered(footer.valueCenterY, footer.valueSize, 1, LINE, CERT.issuedCenterX, 240)]}>{issued}</Text>

        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image
          src={qr}
          style={{
            position: "absolute",
            left: pt(CERT.verifyCenterX - qrBox.size / 2),
            top: pt(qrBox.bottom - qrBox.size),
            width: pt(qrBox.size),
            height: pt(qrBox.size),
          }}
        />
        <Text style={[s.label, centered(footer.labelCenterY, footer.labelSize, 1, LINE, CERT.verifyCenterX, 240)]}>SCAN TO VERIFY</Text>
        <Text style={[s.value, centered(footer.valueCenterY, footer.valueSize, 1, LINE, CERT.verifyCenterX, 240)]}>{opts.code}</Text>
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
