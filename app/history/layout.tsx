import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Generated Tattoo History",
  description: "View your previously generated tattoo designs. Browse through your AI-generated tattoo collection.",
  keywords: [
    "tattoo history",
    "generated tattoos",
    "tattoo collection",
    "my tattoos",
    "saved tattoos",
  ],
  openGraph: {
    title: "Generated Tattoo History",
    description: "View your previously generated tattoo designs. Browse through your AI-generated tattoo collection.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Generated Tattoo History",
    description: "View your previously generated tattoo designs.",
  },
  robots: {
    index: false, // User-specific content, don't index
    follow: true,
  },
};

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

