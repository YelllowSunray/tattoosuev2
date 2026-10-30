"use client";

import WhiteLabelGallery from "../components/WhiteLabelGallery";
import { isAiGeneratorEnabled, studioConfig } from "@/lib/studio-config";

export default function GalleryPage() {
  return (
    <WhiteLabelGallery
      studio={studioConfig}
      showGeneratorLink={isAiGeneratorEnabled()}
    />
  );
}
