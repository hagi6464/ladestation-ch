import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ladestation Schweiz",
    short_name: "Ladestation",
    description:
      "Alle öffentlichen Ladesäulen in der Schweiz mit Live-Verfügbarkeit und Eigentarif des Betreibers",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#ffffff",
    theme_color: "#10b981",
    lang: "de-CH",
    categories: ["navigation", "travel", "utilities"],
    icons: [
      {
        src: "/icon-512.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-512.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
