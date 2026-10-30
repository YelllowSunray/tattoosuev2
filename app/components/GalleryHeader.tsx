"use client";

import Link from "next/link";
import { isAiGeneratorEnabled } from "@/lib/studio-config";
import BookConsultationButton from "./BookConsultationButton";
import StudioWordmark from "./StudioWordmark";

export default function GalleryHeader() {
  return (
    <header className="sticky top-0 z-50 h-16 border-b border-white/5 bg-black/95 backdrop-blur-xl">
      <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex items-center justify-between gap-3">
        <Link href="/" className="min-w-0 flex-shrink">
          <StudioWordmark />
        </Link>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {isAiGeneratorEnabled() && (
            <Link
              href="/generate"
              className="hidden sm:inline-flex text-xs sm:text-sm text-white/70 hover:text-white border border-white/30 px-3 py-1.5 rounded-full transition-colors"
            >
              Generate
            </Link>
          )}
          <BookConsultationButton size="sm" />
        </div>
      </div>
    </header>
  );
}
