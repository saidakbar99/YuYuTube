import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "YuYuTube",
    short_name: "YuYuTube",
    description: "Shaxsiy, tanlab olingan videolar.",
    start_url: "/",
    scope: "/",
    // Android runs the installed app with no status or navigation bars, so the player's fullscreen
    // is the app's own layer, with no system toast and a back press it can catch. iOS ignores it.
    display_override: ["fullscreen"],
    display: "standalone",
    orientation: "any",
    background_color: "#141a33",
    theme_color: "#141a33",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
