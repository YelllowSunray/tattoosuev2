"use client";

import Link from "next/link";
import { useStudio } from "@/lib/studio-context";

export default function SiteFooter({ compact = false }: { compact?: boolean }) {
  const studio = useStudio();
  return (
    <footer
      className={`relative border-t border-white/5 ${compact ? "mt-6 pt-6 pb-28 lg:mt-10 lg:py-8" : "mt-24 py-12"}`}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/30 text-xs font-light tracking-wide">
            © {new Date().getFullYear()} {studio.studioName}
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
  );
}
