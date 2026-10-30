"use client";

import Link from "next/link";
import { useStudio } from "@/lib/studio-context";

type ButtonSize = "sm" | "md" | "lg" | "header";

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-xs sm:text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-10 sm:px-12 py-5 text-base sm:text-lg",
  header:
    "px-3 sm:px-5 py-1.5 sm:py-2.5 text-[11px] sm:text-sm tracking-wide whitespace-nowrap",
};

function isWhatsAppHref(href: string) {
  return /wa\.me\/|whatsapp\.com/i.test(href);
}

function CalendarIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
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
  );
}

function WhatsAppIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

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
  const whatsapp = isWhatsAppHref(href);
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

  const iconClass = size === "lg" ? "w-5 h-5" : "w-4 h-4";
  const content = (
    <>
      {whatsapp ? (
        <WhatsAppIcon className={iconClass} />
      ) : (
        <CalendarIcon className={iconClass} />
      )}
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
