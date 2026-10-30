"use client";

import { useState } from "react";
import { useStudio } from "@/lib/studio-context";

export default function StudioWordmark({
  className = "",
}: {
  className?: string;
}) {
  const studio = useStudio();
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = Boolean(studio.logoUrl) && !logoFailed;

  return (
    <span className={`flex items-center gap-2 min-w-0 ${className}`}>
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={studio.logoUrl}
          alt={studio.logoAlt}
          className="h-8 w-auto max-w-[140px] object-contain"
          onError={() => setLogoFailed(true)}
        />
      ) : null}
      <span className="text-white font-light tracking-tight truncate">
        <span className="hidden sm:inline text-lg">{studio.studioName}</span>
        <span className="sm:hidden text-base">{studio.studioNameShort}</span>
      </span>
    </span>
  );
}
