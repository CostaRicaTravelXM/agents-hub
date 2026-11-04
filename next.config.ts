import type { NextConfig } from "next";

const mediaBase = process.env.NEXT_PUBLIC_MEDIA_URL ? new URL(process.env.NEXT_PUBLIC_MEDIA_URL) : null;
const localMedia = mediaBase ? ["localhost", "127.0.0.1"].includes(mediaBase.hostname) : false;

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  images: {
    qualities: [75, 85],
    formats: ["image/avif", "image/webp"],
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
    "/api/certificates/[code]": ["./assets/fonts/**", "./public/brand/travelxm-logo.png"],
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
