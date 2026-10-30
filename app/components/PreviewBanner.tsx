import { SAMIRDEV } from "@/lib/studios";

export default function PreviewBanner() {
  return (
    <div className="h-8 border-b border-white/5 bg-white/[0.04] text-white/45">
      <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex items-center justify-center">
        <p className="text-[11px] tracking-wide font-light">{SAMIRDEV.banner}</p>
      </div>
    </div>
  );
}
