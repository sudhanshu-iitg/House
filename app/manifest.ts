import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rounds",
    short_name: "Rounds",
    description: "One app for a whole game night.",
    start_url: "/",
    display: "standalone",
    background_color: "#15121c",
    theme_color: "#15121c",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
