/**
 * Studio white-label configuration
 *
 * Edit this file (or override with NEXT_PUBLIC_* env vars) to brand a new
 * studio's gallery. Defaults match the live Sujatha's Compass / Sue's Tattoo
 * Studio site so production looks unchanged until you opt into gallery-only
 * mode.
 *
 * Gallery-only (hide AI generator):
 *   NEXT_PUBLIC_ENABLE_AI_GENERATOR=false
 *
 * Common branding overrides:
 *   NEXT_PUBLIC_STUDIO_NAME
 *   NEXT_PUBLIC_STUDIO_LOGO_URL
 *   NEXT_PUBLIC_BOOKING_LINK
 *   NEXT_PUBLIC_STUDIO_ACCENT          (hex, e.g. #c084fc)
 *   NEXT_PUBLIC_STUDIO_ACCENT_FOREGROUND
 *   NEXT_PUBLIC_SITE_URL
 *   NEXT_PUBLIC_CONTACT_EMAIL
 */

export interface StudioArtist {
  name: string;
  bio?: string;
  specialties?: string[];
  /** Image paths under /public or absolute URLs */
  portfolioImages?: string[];
}

export interface StudioFeaturedWork {
  url: string;
  alt?: string;
  artist?: string;
}

export interface StudioConfig {
  /** Set on /s/<slug> previews so the catalogue API can authorize fetches. */
  slug?: string;
  studioName: string;
  studioNameShort: string;
  /** Homepage hero line (AI product). Unused when the generator is hidden. */
  heroTitle: string;
  heroSubtitle: string;
  /** Label used in the homepage price comparison. */
  aiBrandName: string;

  bookingLink: string;
  bookingLabel: string;
  contactEmail?: string;
  contactPhone?: string;

  logoUrl: string;
  logoAlt: string;

  theme: {
    /** Primary button fill (gallery "Book a consultation"). */
    accent: string;
    accentForeground: string;
    /** Decorative highlight (blobs, emphasis text). */
    highlight: string;
  };

  siteUrl: string;
  description: string;
  keywords: string[];

  social?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };

  /** Named artists shown on the gallery when the array is non-empty. */
  artists: StudioArtist[];
  /** Optional "Our work" strip on the gallery. */
  featuredWork: StudioFeaturedWork[];
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    if (value && value.length > 0) return value;
  }
  return "";
}

export const studioConfig: StudioConfig = {
  studioName: firstNonEmpty(
    process.env.NEXT_PUBLIC_STUDIO_NAME,
    "Sue's Tattoo Studio"
  ),
  studioNameShort: firstNonEmpty(
    process.env.NEXT_PUBLIC_STUDIO_NAME_SHORT,
    "Sue's Tattoo"
  ),
  heroTitle: firstNonEmpty(
    process.env.NEXT_PUBLIC_HERO_TITLE,
    "Sue's AI Tattoo"
  ),
  heroSubtitle: firstNonEmpty(
    process.env.NEXT_PUBLIC_HERO_SUBTITLE,
    "Design Generator"
  ),
  aiBrandName: firstNonEmpty(process.env.NEXT_PUBLIC_AI_BRAND_NAME, "Sue's AI"),

  bookingLink: firstNonEmpty(process.env.NEXT_PUBLIC_BOOKING_LINK, "/support"),
  bookingLabel: firstNonEmpty(
    process.env.NEXT_PUBLIC_BOOKING_LABEL,
    "Book a consultation"
  ),
  contactEmail: firstNonEmpty(
    process.env.NEXT_PUBLIC_CONTACT_EMAIL,
    "contact@sujathascompass.com"
  ),
  contactPhone: process.env.NEXT_PUBLIC_CONTACT_PHONE || undefined,

  logoUrl: firstNonEmpty(process.env.NEXT_PUBLIC_STUDIO_LOGO_URL, ""),
  logoAlt: firstNonEmpty(
    process.env.NEXT_PUBLIC_STUDIO_LOGO_ALT,
    "Sue's Tattoo Studio Logo"
  ),

  theme: {
    accent: firstNonEmpty(process.env.NEXT_PUBLIC_STUDIO_ACCENT, "#ffffff"),
    accentForeground: firstNonEmpty(
      process.env.NEXT_PUBLIC_STUDIO_ACCENT_FOREGROUND,
      "#000000"
    ),
    highlight: firstNonEmpty(
      process.env.NEXT_PUBLIC_STUDIO_HIGHLIGHT,
      "#c084fc"
    ),
  },

  siteUrl: firstNonEmpty(
    process.env.NEXT_PUBLIC_SITE_URL,
    "https://www.sujathascompass.com"
  ),
  description: firstNonEmpty(
    process.env.NEXT_PUBLIC_STUDIO_DESCRIPTION,
    "Explore our curated gallery of tattoo styles. From traditional to geometric, mandala to realism — discover inspiration for your next piece."
  ),
  keywords: [
    "tattoo gallery",
    "tattoo styles",
    "tattoo inspiration",
    "custom tattoo designs",
    "tattoo art",
    "mandala tattoo",
    "geometric tattoo",
    "realism tattoo",
    "traditional tattoo",
  ],

  social: {
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL || undefined,
    facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL || undefined,
    twitter: process.env.NEXT_PUBLIC_TWITTER_URL || undefined,
  },

  // Add the studio's artists and their work here for a white-label gallery.
  // Leave empty to keep the live catalogue-only gallery.
  artists: [
    // {
    //   name: "Alex Rivera",
    //   bio: "Fine line and botanical tattoos",
    //   specialties: ["Fine Line", "Floral", "Blackwork"],
    //   portfolioImages: ["/images/1.png", "/images/2.png"],
    // },
  ],

  featuredWork: [
    // { url: "/images/3.png", alt: "Japanese sleeve", artist: "Alex Rivera" },
  ],
};

export const features = {
  /**
   * When false, the AI generator is hidden (nav, CTAs, and routes redirect
   * to /gallery). Generator code stays in the repo so it can be turned back
   * on as an upgrade. Defaults to true so the live site is unchanged.
   */
  enableAiGenerator: process.env.NEXT_PUBLIC_ENABLE_AI_GENERATOR !== "false",
  enableCredits: process.env.NEXT_PUBLIC_ENABLE_CREDITS !== "false",
  enableParlorMode: process.env.NEXT_PUBLIC_ENABLE_PARLOR_MODE !== "false",
};

export function isAiGeneratorEnabled(): boolean {
  return features.enableAiGenerator;
}

export function areCreditsEnabled(): boolean {
  return features.enableAiGenerator && features.enableCredits;
}

export function isParlorModeEnabled(): boolean {
  return features.enableAiGenerator && features.enableParlorMode;
}

export function getStudioCssVars(
  config: StudioConfig = studioConfig
): Record<string, string> {
  return {
    "--studio-accent": config.theme.accent,
    "--studio-accent-foreground": config.theme.accentForeground,
    "--studio-highlight": config.theme.highlight,
  };
}

export const GENERATOR_ROUTE_PREFIXES = [
  "/generate",
  "/credits",
  "/history",
  "/customers",
  "/pricing",
  "/favorite-styles",
  "/admin",
] as const;

export function isGeneratorRoute(pathname: string): boolean {
  return GENERATOR_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
