import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.com';
const siteName = "Sue's Tattoo Studio";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} - Find Your Perfect Tattoo Design`,
    template: `%s | ${siteName}`,
  },
  description: "Discover beautiful tattoo designs. Browse hundreds of tattoo styles including mandala, realism, traditional, and more. Filter by body placement, style, and category to find your perfect tattoo inspiration.",
  keywords: [
    "tattoo designs",
    "tattoo gallery",
    "tattoo inspiration",
    "tattoo styles",
    "body art",
    "tattoo placement",
    "mandala tattoo",
    "realism tattoo",
    "traditional tattoo",
    "tattoo ideas",
    "tattoo portfolio",
    "tattoo artist",
  ],
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: siteName,
    title: `${siteName} - Find Your Perfect Tattoo Design`,
    description: "Discover beautiful tattoo designs. Browse hundreds of tattoo styles including mandala, realism, traditional, and more. Filter by body placement, style, and category to find your perfect tattoo inspiration.",
    images: [
      {
        url: `${siteUrl}/og-image.jpg`, // You'll need to create this image
        width: 1200,
        height: 630,
        alt: `${siteName} - Tattoo Design Gallery`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} - Find Your Perfect Tattoo Design`,
    description: "Discover beautiful tattoo designs. Browse hundreds of tattoo styles and find your perfect tattoo inspiration.",
    images: [`${siteUrl}/og-image.jpg`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Add your verification codes here when available
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
    // bing: "your-bing-verification-code",
  },
  manifest: "/manifest.json",
  other: {
    "theme-color": "#000000",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
        <Analytics />
        <Script
          id="microsoft-clarity"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "ut6gekss9j");
            `,
          }}
        />
      </body>
    </html>
  );
}
