import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAiGeneratorEnabled, isGeneratorRoute } from "@/lib/studio-config";

/**
 * When the AI generator is disabled, the gallery is the product:
 * send visitors away from generator marketing/app routes.
 * Page modules are left in the repo so the flag can be turned back on.
 */
export function proxy(request: NextRequest) {
  if (isAiGeneratorEnabled()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (pathname === "/" || isGeneratorRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/gallery";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/generate/:path*",
    "/credits/:path*",
    "/history/:path*",
    "/customers/:path*",
    "/pricing/:path*",
    "/favorite-styles/:path*",
    "/admin/:path*",
  ],
};
