import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Red String",
    short_name: "Red String",
    description: "Your relationship copilot for the full lifetime of a couple.",
    start_url: "/onboarding",
    scope: "/",
    display: "standalone",
    background_color: "#fff7ed",
    theme_color: "#f43f5e",
    orientation: "portrait",
    categories: ["lifestyle", "social", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-1024.png",
        sizes: "1024x1024",
        type: "image/png",
      },
    ],
  };
}
