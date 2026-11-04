import type { Metadata, Viewport } from "next";
import { Anton, Arimo, Be_Vietnam_Pro, Montserrat, Playfair_Display } from "next/font/google";
import { Toaster } from "@/components/ui/toast";
import { ServiceWorkerRegister } from "@/components/sw-register";
import "./globals.css";

const anton = Anton({ variable: "--nf-anton", weight: "400", subsets: ["latin"], display: "swap" });
const playfair = Playfair_Display({
  variable: "--nf-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});
const montserrat = Montserrat({
  variable: "--nf-montserrat",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});
const arimo = Arimo({ variable: "--nf-arimo", subsets: ["latin"], style: ["normal", "italic"], display: "swap" });
const vietnam = Be_Vietnam_Pro({
  variable: "--nf-vietnam",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "TravelXM Academy",
    template: "%s · TravelXM Academy",
  },
  description:
    "The TravelXM learning platform for travel advisors. Learn Costa Rica destinations, hotels and experiences, and get certified.",
  applicationName: "TravelXM Academy",
  appleWebApp: { capable: true, title: "TravelXM Academy", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#FDF6E3",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${playfair.variable} ${montserrat.variable} ${arimo.variable} ${vietnam.variable}`}
    >
      <body>
        {children}
        <Toaster />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
