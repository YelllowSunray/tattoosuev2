import type { Metadata } from "next";
import { studioConfig } from "@/lib/studio-config";

export const metadata: Metadata = {
  title: "Gallery",
  description: studioConfig.description,
  keywords: studioConfig.keywords,
  openGraph: {
    title: `${studioConfig.studioName} Gallery`,
    description: studioConfig.description,
    type: "website",
  },
};

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
