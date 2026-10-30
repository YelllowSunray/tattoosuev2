import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider } from "@/lib/auth-context";
import {
  studioConfig,
  isAiGeneratorEnabled,
  getStudioCssVars,
} from "@/lib/studio-config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = studioConfig.siteUrl;
const siteName = studioConfig.studioName;
const generatorEnabled = isAiGeneratorEnabled();

const defaultTitle = generatorEnabled
  ? `${siteName} - AI Tattoo Generator | Create Custom Designs`
  : `${siteName} | Tattoo Gallery`;
const defaultDescription = generatorEnabled
  ? "Generate custom AI tattoo designs instantly. Visualize tattoos on your body, create designs from photos, and explore 100+ styles. The most affordable AI tattoo generator at just $0.20 per image."
  : studioConfig.description;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: `%s | ${siteName}`,
  },
  description: defaultDescription,
  keywords: generatorEnabled
    ? [
        "AI tattoo generator",
        "AI tattoo design",
        "custom tattoo generator",
        "tattoo design generator",
        "AI generated tattoo",
        "create tattoo design",
        "tattoo visualization",
        "body tattoo preview",
        "tattoo from photo",
        "mandala tattoo generator",
        "realism tattoo AI",
        "geometric tattoo design",
        "tattoo styles",
        "cheap AI tattoo",
        "tattoo design app",
      ]
    : studioConfig.keywords,
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: siteName,
    title: defaultTitle,
    description: generatorEnabled
      ? "Generate custom AI tattoo designs instantly. Visualize tattoos on your body, create designs from photos, and explore 100+ styles. The most affordable AI tattoo generator."
      : studioConfig.description,
    images: [
      {
        url: `${siteUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: generatorEnabled
          ? `${siteName} - AI Tattoo Design Generator`
          : `${siteName} tattoo gallery`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: generatorEnabled
      ? "Generate custom AI tattoo designs instantly. Visualize on your body, create from photos, 100+ styles. Most affordable at $0.20/image."
      : studioConfig.description,
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
  other: {
    "theme-color": studioConfig.theme.accent,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={getStudioCssVars() as CSSProperties}>
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
        {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-17904025003"
          strategy="afterInteractive"
        />
        <Script
          id="google-ads"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'AW-17904025003');
            `,
          }}
        />
      </body>
    </html>
  );
}
