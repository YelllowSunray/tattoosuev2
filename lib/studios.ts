import type { StudioConfig } from "@/lib/studio-config";
import { studioConfig } from "@/lib/studio-config";
import studiosJson from "@/data/studios.json";

export type StudioPlan = "demo" | "paid";

/** Per-studio personalization is branding only — never a studio portfolio. */
export interface StudioRecord {
  slug: string;
  name: string;
  nameShort?: string;
  logoUrl?: string;
  accent?: string;
  accentForeground?: string;
  highlight?: string;
  bookingLink: string;
  bookingLabel?: string;
  contactEmail?: string;
  /** demo = 14-day preview with banner; paid = lifetime, set by scripts/activate-studio. */
  plan: StudioPlan;
  createdAt: string;
  trialEndsAt?: string;
}

export const SAMIRDEV = {
  label: "SamirDev",
  banner: "Preview by SamirDev",
  contactHref:
    process.env.NEXT_PUBLIC_SAMIRDEV_CONTACT ||
    "mailto:iyersamir@gmail.com?subject=Activate%20gallery%20preview",
  contactLabel: "Contact SamirDev to activate",
};

export const studios: StudioRecord[] = studiosJson as StudioRecord[];

export function getStudioBySlug(slug: string): StudioRecord | undefined {
  return studios.find((studio) => studio.slug === slug);
}

export function isStudioExpired(studio: StudioRecord, now = new Date()): boolean {
  if (studio.plan === "paid") return false;
  if (!studio.trialEndsAt) return false;
  const ends = new Date(studio.trialEndsAt);
  if (Number.isNaN(ends.getTime())) return false;
  return now.getTime() > ends.getTime();
}

export function isDemoPreview(studio: StudioRecord): boolean {
  return studio.plan === "demo";
}

export function studioRecordToConfig(studio: StudioRecord): StudioConfig {
  const accent = studio.accent || "#ffffff";
  return {
    ...studioConfig,
    studioName: studio.name,
    studioNameShort: studio.nameShort || studio.name,
    bookingLink: studio.bookingLink,
    bookingLabel: studio.bookingLabel || "Book a consultation",
    contactEmail: studio.contactEmail,
    logoUrl: studio.logoUrl || "",
    logoAlt: `${studio.name} logo`,
    theme: {
      accent,
      accentForeground: studio.accentForeground || "#000000",
      highlight: studio.highlight || accent,
    },
    description: `Explore tattoo styles at ${studio.name}. Sample and combine styles, then book a consultation.`,
    artists: [],
    featuredWork: [],
  };
}

export function slugifyStudioName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
