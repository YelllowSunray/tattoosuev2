import { studioConfig } from "@/lib/studio-config";

export default function StudioWordmark({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span className={`flex items-center gap-2 min-w-0 ${className}`}>
      {studioConfig.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={studioConfig.logoUrl}
          alt={studioConfig.logoAlt}
          className="h-8 w-auto max-w-[140px] object-contain"
        />
      ) : null}
      <span className="text-white font-light tracking-tight truncate">
        <span className="hidden sm:inline text-lg">
          {studioConfig.studioName}
        </span>
        <span className="sm:hidden text-base">
          {studioConfig.studioNameShort}
        </span>
      </span>
    </span>
  );
}
