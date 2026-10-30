import { NextRequest, NextResponse } from "next/server";
import { getStudioBySlug, isStudioExpired } from "@/lib/studios";

export function isActiveStudioSlug(slug: string | null | undefined): boolean {
  if (!slug) return false;
  const studio = getStudioBySlug(slug);
  return Boolean(studio && !isStudioExpired(studio));
}

function isSameOrigin(req: NextRequest, url: URL): boolean {
  return url.host === req.nextUrl.host;
}

/**
 * Full tattoo catalogue is only for active /s/<slug> previews (query
 * `studio=<slug>` or same-origin Referer). Bare /api/get-tattoos is not public.
 */
export function hasTattooCatalogAccess(req: NextRequest): boolean {
  if (isActiveStudioSlug(req.nextUrl.searchParams.get("studio"))) {
    return true;
  }

  const referer = req.headers.get("referer");
  if (!referer) return false;

  try {
    const url = new URL(referer);
    if (!isSameOrigin(req, url)) return false;

    const studioMatch = url.pathname.match(
      /^\/s\/([a-z0-9]+(?:-[a-z0-9]+)*)/
    );
    return Boolean(studioMatch && isActiveStudioSlug(studioMatch[1]));
  } catch {
    return false;
  }
}

export function catalogDeniedResponse() {
  return NextResponse.json(
    {
      success: false,
      error: "Style catalogue is available on an active studio preview.",
    },
    { status: 401 }
  );
}
