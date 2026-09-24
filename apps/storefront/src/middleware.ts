import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  const platformDomain = (
    process.env.PLATFORM_DOMAIN || "platform.local"
  ).toLowerCase();

  let slug: string | undefined;

  // 1. Direct header override for testing
  const explicitSlug = request.headers.get("x-tenant-slug");
  if (explicitSlug) {
    slug = explicitSlug.trim().toLowerCase();
  }

  // 2. Extract subdomain from host: {slug}.platform.local
  if (!slug && host && host.endsWith(platformDomain)) {
    const prefix = host.replace(`.${platformDomain}`, "");
    const parts = prefix.split(".");
    if (parts.length === 1 && parts[0] !== "www" && parts[0] !== "store") {
      slug = parts[0];
    }
  }

  // If request is for an error page, allow it through
  if (request.nextUrl.pathname.startsWith("/_error")) {
    return NextResponse.next();
  }

  // Inject tenant header into request
  const requestHeaders = new Headers(request.headers);
  if (slug) {
    requestHeaders.set("x-tenant-slug", slug);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
