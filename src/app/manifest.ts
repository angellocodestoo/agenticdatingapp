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
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
    ],
  };
}
