import type { Metadata, Viewport } from "next";
import { Anton, Be_Vietnam_Pro, Playfair_Display } from "next/font/google";
import { Toaster } from "@/components/ui/toast";
import { ServiceWorkerRegister } from "@/components/sw-register";
import "./globals.css";

// Certificates only, so they are not preloaded on every page.
const anton = Anton({ variable: "--nf-anton", weight: "400", subsets: ["latin"], display: "swap", preload: false });
const playfair = Playfair_Display({
  variable: "--nf-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
});
const vietnam = Be_Vietnam_Pro({
  variable: "--nf-vietnam",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "TravelXM Agents Hub",
    template: "%s · TravelXM Agents Hub",
  },
  description:
    "The TravelXM hub for travel advisors who sell Costa Rica: training and certification, masterclasses, FAM trips, current offers, books and marketing assets.",
  applicationName: "TravelXM Agents Hub",
  appleWebApp: { capable: true, title: "TravelXM Agents Hub", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${playfair.variable} ${vietnam.variable}`}
    >
      <body>
        {children}
        <Toaster />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
