import type { MetadataRoute } from "next";
import { isAiGeneratorEnabled, studioConfig } from "@/lib/studio-config";

export default function manifest(): MetadataRoute.Manifest {
  const generatorEnabled = isAiGeneratorEnabled();
  return {
    name: generatorEnabled
      ? `${studioConfig.studioNameShort} AI Tattoo Generator`
      : studioConfig.studioName,
    short_name: studioConfig.studioNameShort,
    description: generatorEnabled
      ? "AI tattoo design generator. Create custom tattoo designs instantly, visualize on your body, and explore 100+ styles."
      : studioConfig.description,
    start_url: generatorEnabled ? "/" : "/gallery",
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
