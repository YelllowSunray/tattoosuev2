import type { Metadata } from "next";

/**
 * Studio preview routes must not inherit the root "Sue's Tattoo Studio"
 * title template, authors, or Open Graph site name.
 */
export const metadata: Metadata = {
  title: {
    absolute: "Style explorer",
    template: "%s | Style explorer",
  },
  authors: [{ name: "SamirDev" }],
  creator: "SamirDev",
  publisher: "SamirDev",
  openGraph: {
    siteName: "Style explorer",
    title: "Style explorer",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Style explorer",
      },
    ],
  },
  twitter: {
    title: "Style explorer",
  },
};

export default function StudioRoutesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
