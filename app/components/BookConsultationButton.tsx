"use client";

import Link from "next/link";
import { useStudio } from "@/lib/studio-context";

type ButtonSize = "sm" | "md" | "lg" | "header";

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-xs sm:text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-10 sm:px-12 py-5 text-base sm:text-lg",
  header:
    "px-3.5 sm:px-5 py-2 sm:py-2.5 text-[11px] sm:text-sm tracking-wide whitespace-nowrap",
};

export default function BookConsultationButton({
  size = "md",
  className = "",
  fullWidth = false,
}: {
  size?: ButtonSize;
  className?: string;
  fullWidth?: boolean;
}) {
  const studio = useStudio();
  const href = studio.bookingLink;
  if (!href) return null;

  const isInternal = href.startsWith("/");
  const label = studio.bookingLabel;
  const classes = [
    "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-300 hover:scale-[1.02] hover:opacity-90",
    sizeClasses[size],
    fullWidth ? "w-full sm:w-auto" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const style = {
    backgroundColor: "var(--studio-accent)",
    color: "var(--studio-accent-foreground)",
  };

  const content = (
    <>
      <svg
        className={size === "lg" ? "w-5 h-5" : "w-4 h-4"}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">
        {size === "sm" || size === "header" ? "Book" : label}
      </span>
    </>
  );

  if (isInternal) {
    return (
      <Link href={href} className={classes} style={style}>
        {content}
      </Link>
    );
  }

  return (
    <a
      href={href}
      className={classes}
      style={style}
      target="_blank"
      rel="noopener noreferrer"
    >
      {content}
    </a>
  );
}
