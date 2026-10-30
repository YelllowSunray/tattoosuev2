import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Style explorer for tattoo studios",
  description:
    "Style explorer for tattoo studios, branded for your studio. The full style catalogue is available on a studio preview.",
  openGraph: {
    title: "Style explorer for tattoo studios",
    description:
      "Style explorer for tattoo studios, branded for your studio.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
