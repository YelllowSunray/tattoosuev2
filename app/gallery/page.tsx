"use client";

import Link from "next/link";
import GardenOfTattooStyles from "../components/GardenOfTattooStyles";

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <main>
        <GardenOfTattooStyles
          showHeader={false}
          stickyTopClass="top-0"
          sidebarHeightClass="h-screen"
        />
      </main>

      <footer className="relative mt-24 border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/30 text-xs font-light tracking-wide">
              © {new Date().getFullYear()} Sue&apos;s Tattoo Studio
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="/terms"
                className="text-xs text-white/50 hover:text-white/70 font-light tracking-wide transition-colors"
              >
                Terms
              </Link>
              <Link
                href="/privacy"
                className="text-xs text-white/50 hover:text-white/70 font-light tracking-wide transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/support"
                className="text-xs text-white/50 hover:text-white/70 font-light tracking-wide transition-colors"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
