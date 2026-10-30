"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import GardenOfTattooStyles from "./GardenOfTattooStyles";
import BookConsultationButton from "./BookConsultationButton";
import StudioWordmark from "./StudioWordmark";
import SiteFooter from "./SiteFooter";
import PreviewBanner from "./PreviewBanner";
import { StudioProvider } from "@/lib/studio-context";
import { getStudioCssVars, type StudioConfig } from "@/lib/studio-config";

export default function StudioPreviewLayout({
  studio,
  homeHref,
  showDemoBanner = false,
}: {
  studio: StudioConfig;
  homeHref: string;
  showDemoBanner?: boolean;
}) {
  const stickyTopClass = showDemoBanner ? "top-[6.25rem]" : "top-[4.5rem]";
  const sidebarHeightClass = showDemoBanner
    ? "h-[calc(100vh-6.25rem)]"
    : "h-[calc(100vh-4.5rem)]";

  return (
    <StudioProvider studio={studio}>
      <div
        className="min-h-screen bg-black text-white overflow-x-hidden"
        style={getStudioCssVars(studio) as CSSProperties}
      >
        <div className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl">
          {showDemoBanner && <PreviewBanner />}
          <header className="border-b border-white/[0.08]">
            <div
              className="h-12 lg:h-[4.5rem] max-w-7xl mx-auto px-3 sm:px-6 lg:px-12 flex items-center justify-between gap-2 sm:gap-6"
              style={{
                boxShadow:
                  "inset 0 -1px 0 color-mix(in srgb, var(--studio-accent) 35%, transparent)",
              }}
            >
              <Link href={homeHref} className="min-w-0 flex-1">
                <StudioWordmark size="lg" />
              </Link>
              <BookConsultationButton size="header" />
            </div>
          </header>
        </div>

        <main>
          <GardenOfTattooStyles
            showHeader={false}
            mode="studio"
            stickyTopClass={stickyTopClass}
            sidebarHeightClass={sidebarHeightClass}
          />
        </main>

        <SiteFooter compact />
      </div>
    </StudioProvider>
  );
}
