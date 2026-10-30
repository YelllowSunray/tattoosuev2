import type { MetadataRoute } from "next";
import { studioConfig } from "@/lib/studio-config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Style explorer for tattoo studios",
    short_name: "SamirDev",
    description:
      "Style explorer for tattoo studios, branded for your studio.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: studioConfig.theme.accent,
    orientation: "portrait-primary",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
