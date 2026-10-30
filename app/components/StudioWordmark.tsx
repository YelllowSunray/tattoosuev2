"use client";

import { useState } from "react";
import { useStudio } from "@/lib/studio-context";

const sizeStyles = {
  sm: {
    logo: "h-7 w-auto max-w-[120px]",
    mark: "h-7 w-7 text-[10px]",
    name: "text-base sm:text-lg",
  },
  md: {
    logo: "h-8 w-auto max-w-[140px]",
    mark: "h-8 w-8 text-[11px]",
    name: "text-lg",
  },
  lg: {
    logo: "h-9 sm:h-10 w-auto max-w-[160px] sm:max-w-[200px]",
    mark: "h-9 w-9 sm:h-11 sm:w-11 text-xs sm:text-sm",
    name: "text-lg sm:text-2xl",
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
    <span className={`flex items-center gap-2.5 min-w-0 ${className}`}>
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={studio.logoUrl}
          alt={studio.logoAlt}
          className={`${styles.logo} object-contain flex-shrink-0`}
          onError={() => setLogoFailed(true)}
        />
      ) : (
        <span
          className={`${styles.mark} flex-shrink-0 inline-flex items-center justify-center border font-medium tracking-[0.14em]`}
          style={{
            borderColor:
              "color-mix(in srgb, var(--studio-accent) 65%, transparent)",
            color: "var(--studio-accent)",
          }}
          aria-hidden="true"
        >
          {studioInitials(studio.studioNameShort || studio.studioName)}
        </span>
      )}
      <span
        className={`min-w-0 truncate font-light tracking-[0.04em] text-white ${styles.name} ${showLogo ? "hidden sm:inline" : "inline"}`}
      >
        <span className="hidden sm:inline">{studio.studioName}</span>
        <span className="sm:hidden">{studio.studioNameShort}</span>
      </span>
    </span>
  );
}
