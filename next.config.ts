import type { NextConfig } from "next";

const mediaBase = process.env.NEXT_PUBLIC_MEDIA_URL ? new URL(process.env.NEXT_PUBLIC_MEDIA_URL) : null;
const localMedia = mediaBase ? ["localhost", "127.0.0.1"].includes(mediaBase.hostname) : false;

// Files pdf.js loads at runtime by path (the tracer cannot see them): the native canvas, the
// worker module, and the font, cmap and wasm data pdf-to-img points it at. Vercel functions run
// on Linux x64 (glibc); the win32/darwin canvas packages only exist on dev machines.
const BOOK_RENDER_FILES = [
  "./node_modules/@napi-rs/canvas/**/*",
  "./node_modules/@napi-rs/canvas-linux-x64-gnu/**/*",
  "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
  "./node_modules/pdfjs-dist/standard_fonts/**/*",
  "./node_modules/pdfjs-dist/cmaps/**/*",
  "./node_modules/pdfjs-dist/wasm/**/*",
];

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  devIndicators: false,
  // Book pages are rendered on the server with pdf.js and a native canvas; these must not be bundled.
  serverExternalPackages: ["pdf-to-img", "pdfjs-dist", "@napi-rs/canvas", "sharp"],
  images: {
    qualities: [75, 85],
    // WebP only: every browser the audience uses reads it, older iPads do not read
    // AVIF, and AVIF requests for some photo and width pairs hung in the optimizer.
    formats: ["image/webp"],
    remotePatterns: mediaBase
      ? [
          {
            protocol: mediaBase.protocol.replace(":", "") as "http" | "https",
            hostname: mediaBase.hostname,
            port: mediaBase.port,
            pathname: `${mediaBase.pathname.replace(/\/$/, "")}/**`,
          },
        ]
      : [],
    // Local development serves media from RustFS on localhost.
    dangerouslyAllowLocalIP: localMedia,
  },
  // Brand fonts for the certificate PDF route.
  outputFileTracingIncludes: {
    "/api/certificates/[code]": ["./assets/fonts/**", "./public/brand/travelxm-logo.png", "./public/brand/cutouts/toucan.png"],
    // Book rendering: the admin save/inspect/prepare actions and the page route.
    "/admin/books/*": BOOK_RENDER_FILES,
    "/api/hub/books/*/page/*": BOOK_RENDER_FILES,
  },
  // Masterclasses live in Learning now. Old links, including the marketing site's, keep working.
  async redirects() {
    return [
      { source: "/masterclasses", destination: "/courses?category=masterclasses", permanent: true },
      { source: "/masterclasses/:slug", destination: "/courses/:slug", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
