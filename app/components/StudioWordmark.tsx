"use client";

import { useState } from "react";
import { useStudio } from "@/lib/studio-context";

const sizeStyles = {
  sm: {
    logo: "h-8 w-8",
    mark: "h-8 w-8 text-[10px]",
    name: "text-base sm:text-lg",
  },
  md: {
    logo: "h-9 w-9",
    mark: "h-9 w-9 text-[11px]",
    name: "text-lg",
  },
  lg: {
    logo: "h-8 w-8 lg:h-11 lg:w-11",
    mark: "h-8 w-8 lg:h-11 lg:w-11 text-[10px] lg:text-xs",
    name: "text-[15px] lg:text-2xl",
  },
} as const;

function studioInitials(name: string): string {
  const parts = name
    .replace(/&/g, " ")
    .split(/\s+/)
    .filter((part) => /[A-Za-z0-9]/.test(part));
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  const compact = name.replace(/[^A-Za-z0-9]/g, "");
  return compact.slice(0, 2).toUpperCase() || "S";
}

export default function StudioWordmark({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: keyof typeof sizeStyles;
}) {
  const studio = useStudio();
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = Boolean(studio.logoUrl) && !logoFailed;
  const styles = sizeStyles[size];

  return (
    <span className={`flex items-center gap-2 sm:gap-4 min-w-0 ${className}`}>
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={studio.logoUrl}
          alt={studio.logoAlt}
          className={`${styles.logo} rounded-full object-cover flex-shrink-0 ring-1 ring-white/15`}
          onError={() => setLogoFailed(true)}
        />
      ) : (
        <span
          className={`${styles.mark} relative flex-shrink-0 inline-flex items-center justify-center rounded-full font-medium tracking-[0.14em]`}
          style={{
            color: "var(--studio-accent)",
            boxShadow:
              "0 0 0 1px color-mix(in srgb, var(--studio-accent) 70%, transparent), inset 0 0 0 3px color-mix(in srgb, var(--studio-accent) 35%, transparent)",
          }}
          aria-hidden="true"
        >
          {studioInitials(studio.studioNameShort || studio.studioName)}
        </span>
      )}
      <span
        className={`min-w-0 truncate font-light tracking-[0.04em] text-white ${styles.name}`}
      >
        <span className="hidden sm:inline">{studio.studioName}</span>
        <span className="sm:hidden">{studio.studioNameShort}</span>
      </span>
    </span>
  );
}
