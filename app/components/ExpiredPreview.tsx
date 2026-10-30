import Link from "next/link";
import { SAMIRDEV, type StudioRecord } from "@/lib/studios";

export default function ExpiredPreview({ studio }: { studio: StudioRecord }) {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-lg text-center space-y-6">
        <p className="text-white/40 text-xs uppercase tracking-[0.2em]">
          {studio.name}
        </p>
        <h1 className="text-3xl sm:text-4xl font-light tracking-tight">
          This preview has expired
        </h1>
        <p className="text-white/55 text-sm sm:text-base font-light leading-relaxed">
          The 14-day demo for this gallery has ended. {SAMIRDEV.contactLabel}{" "}
          and we&apos;ll turn it into a live, branded site for the studio.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={SAMIRDEV.contactHref}
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-black bg-white hover:opacity-90"
          >
            {SAMIRDEV.contactLabel}
          </a>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 text-sm text-white/70 border border-white/20 hover:border-white/40"
          >
            Back to Sujatha&apos;s Compass
          </Link>
        </div>
      </div>
    </div>
  );
}
