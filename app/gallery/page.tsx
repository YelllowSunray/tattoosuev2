"use client";

import GardenOfTattooStyles from "../components/GardenOfTattooStyles";
import GalleryHeader from "../components/GalleryHeader";
import BookConsultationButton from "../components/BookConsultationButton";
import ArtistsShowcase from "../components/ArtistsShowcase";
import SiteFooter from "../components/SiteFooter";
import { studioConfig } from "@/lib/studio-config";

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <GalleryHeader />

      <section className="border-b border-white/5 bg-gradient-to-b from-black via-black to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8 sm:py-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-2">
              {studioConfig.studioName}
            </p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-light tracking-tight text-white mb-3">
              Garden of Tattoo Styles
            </h1>
            <p className="text-white/60 text-sm sm:text-base font-light">
              Explore 100&apos;s of styles — find the one you love, then book a
              consultation with the studio.
            </p>
          </div>
          <BookConsultationButton size="lg" fullWidth />
        </div>
      </section>

      <ArtistsShowcase />

      <main>
        <GardenOfTattooStyles
          showHeader={false}
          stickyTopClass="top-16"
          sidebarHeightClass="h-[calc(100vh-4rem)]"
        />
      </main>

      <section className="border-t border-white/5 py-12">
        <div className="max-w-3xl mx-auto px-4 text-center space-y-5">
          <h2 className="text-2xl sm:text-3xl font-light text-white">
            Ready to get inked?
          </h2>
          <p className="text-white/50 text-sm sm:text-base font-light">
            Bring a style you love — or just an idea — and we&apos;ll shape it
            into a custom piece.
          </p>
          <BookConsultationButton size="lg" />
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
