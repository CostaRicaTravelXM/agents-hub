import "server-only";
import path from "node:path";
import { readFileSync } from "node:fs";
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";

const root = process.cwd();
let registered = false;
function registerFonts() {
  if (registered) return;
  registered = true;
  const f = (name: string) => path.join(root, "assets/fonts", name);
  Font.register({ family: "Anton", src: f("Anton-Regular.ttf") });
  Font.register({ family: "Playfair", src: f("PlayfairDisplay-BoldItalic.ttf"), fontStyle: "italic", fontWeight: 700 });
  Font.register({
    family: "Montserrat",
    fonts: [
      { src: f("Montserrat-Medium.ttf"), fontWeight: 500 },
      { src: f("Montserrat-SemiBold.ttf"), fontWeight: 600 },
    ],
  });
  Font.register({ family: "Arimo", fonts: [{ src: f("Arimo-Regular.ttf") }, { src: f("Arimo-Bold.ttf"), fontWeight: 700 }] });
  Font.registerHyphenationCallback((word) => [word]);
}

const s = StyleSheet.create({
  page: { backgroundColor: "#FDF6E3", padding: 28, fontFamily: "Arimo", color: "#3D3733" },
  frame: { flex: 1, borderWidth: 4, borderColor: "#3D3733", padding: 44, position: "relative" },
  inner: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 48 },
  logo: { width: 84, height: 84 },
  eyebrow: { marginTop: 18, fontFamily: "Montserrat", fontWeight: 600, fontSize: 10, letterSpacing: 2.2, color: "#70A91B", textTransform: "uppercase" },
  lead: { marginTop: 20, fontSize: 12, color: "#6B625C" },
  name: { marginTop: 8, fontFamily: "Playfair", fontStyle: "italic", fontWeight: 700, fontSize: 38, color: "#000000", textAlign: "center" },
  rule: { marginTop: 14, width: 64, height: 4, backgroundColor: "#70A91B" },
  course: { marginTop: 16, fontFamily: "Anton", fontSize: 34, color: "#000000", textTransform: "uppercase", textAlign: "center", lineHeight: 1 },
  body: { marginTop: 18, fontSize: 11.5, color: "#3D3733", textAlign: "center", maxWidth: 440, lineHeight: 1.55 },
  foot: { position: "absolute", left: 44, right: 44, bottom: 36, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  footLabel: { fontFamily: "Montserrat", fontWeight: 600, fontSize: 8, letterSpacing: 1.4, color: "#6B625C", textTransform: "uppercase" },
  footValue: { marginTop: 4, fontFamily: "Montserrat", fontWeight: 500, fontSize: 11, color: "#000000" },
  signLine: { width: 160, borderTopWidth: 1, borderTopColor: "#3D3733", paddingTop: 6 },
  toucan: { position: "absolute", right: -22, top: 36, width: 140, height: 99 },
  verify: { flexDirection: "row", alignItems: "flex-end" },
  verifyText: { alignItems: "flex-end", marginRight: 10 },
  qr: { width: 64, height: 64 },
});

/** Ink on the page's cream, so the code reads as part of the certificate. */
function qrPng(url: string) {
  return QRCode.toDataURL(url, { margin: 0, width: 384, errorCorrectionLevel: "M", color: { dark: "#3D3733", light: "#FDF6E3" } });
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
  const logo = { data: readFileSync(path.join(root, "public/brand/travelxm-logo.png")), format: "png" as const };
  const toucan = { data: readFileSync(path.join(root, "public/brand/cutouts/toucan.png")), format: "png" as const };
  const issued = new Date(opts.issuedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const doc = (
    <Document title={`${opts.course} · ${opts.recipient}`} author="TravelXM Academy" subject="Certificate of completion">
      <Page size="LETTER" orientation="landscape" style={s.page}>
        <View style={s.frame}>
          <View style={s.inner}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={logo} style={s.logo} />
            <Text style={s.eyebrow}>TravelXM Academy · Certificate of completion</Text>
            <Text style={s.lead}>This certifies that</Text>
            <Text style={s.name}>{opts.recipient}</Text>
            <View style={s.rule} />
            <Text style={s.lead}>has completed</Text>
            <Text style={s.course}>{opts.course}</Text>
            <Text style={s.body}>
              and is recognized by TravelXM as a travel advisor trained to plan and sell this program. Pura Vida.
            </Text>
          </View>
          <View style={s.foot}>
            <View>
              <Text style={s.footLabel}>Issued</Text>
              <Text style={s.footValue}>{issued}</Text>
            </View>
            <View style={s.signLine}>
              <Text style={s.footLabel}>TravelXM Academy</Text>
              <Text style={s.footValue}>San José, Costa Rica</Text>
            </View>
            <View style={s.verify}>
              <View style={s.verifyText}>
                <Text style={s.footLabel}>Scan to verify</Text>
                <Text style={s.footValue}>{opts.code}</Text>
              </View>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={qr} style={s.qr} />
            </View>
          </View>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={toucan} style={s.toucan} />
        </View>
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
