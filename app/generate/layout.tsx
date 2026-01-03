import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Generate Tattoo Design",
  description: "Generate custom tattoo designs using AI. Create unique tattoo designs with Imagen 4, NanoBanana, or Gemini 2.5. Choose your style, placement, and reference images.",
  keywords: [
    "generate tattoo",
    "AI tattoo generator",
    "custom tattoo design",
    "tattoo design generator",
    "AI tattoo art",
    "create tattoo design",
  ],
  openGraph: {
    title: "Generate Tattoo Design - AI Tattoo Generator",
    description: "Generate custom tattoo designs using AI. Create unique tattoo designs with multiple AI models.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Generate Tattoo Design - AI Tattoo Generator",
    description: "Generate custom tattoo designs using AI. Create unique tattoo designs with multiple AI models.",
  },
  robots: {
    index: true, // Generation is now enabled
    follow: true,
  },
};

export default function GenerateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

