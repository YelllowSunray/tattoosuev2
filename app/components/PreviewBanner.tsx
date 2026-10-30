import { SAMIRDEV } from "@/lib/studios";

export default function PreviewBanner() {
  return (
    <div
      className="border-b border-white/[0.05]"
      style={{
        background:
          "linear-gradient(90deg, transparent, color-mix(in srgb, var(--studio-accent) 8%, transparent) 50%, transparent)",
      }}
    >
      <div className="h-7 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex items-center justify-center sm:justify-end gap-2">
        <span
          className="w-1 h-1 rotate-45 opacity-70"
          style={{ backgroundColor: "var(--studio-accent)" }}
          aria-hidden="true"
        />
        <p className="text-[10px] tracking-[0.22em] uppercase text-white/35 font-light">
          {SAMIRDEV.banner}
        </p>
      </div>
    </div>
  );
}
