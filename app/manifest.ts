import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TravelXM Agents Hub",
    short_name: "XM Hub",
    description: "Training, masterclasses, FAM trips, offers and sales tools for travel advisors who sell Costa Rica.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    // "any": the book reader shows two pages side by side in landscape.
    orientation: "any",
    background_color: "#FFFFFF",
    theme_color: "#FFFFFF",
    categories: ["education", "travel", "business"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Home", url: "/dashboard" },
      { name: "Learning", url: "/courses" },
      { name: "FAM Trips", url: "/fam-trips" },
      { name: "Books", url: "/books" },
    ],
  };
}
