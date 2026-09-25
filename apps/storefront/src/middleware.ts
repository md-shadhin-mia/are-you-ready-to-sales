import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  const platformDomain = (
    process.env.PLATFORM_DOMAIN || "platform.local"
  ).toLowerCase();

  let slug: string | undefined;

  // 1. Direct header override — local/testing only. In production this must
  //    never be honored from an incoming client request: it would let any
  //    caller spoof an arbitrary store by setting a header, since this value
  //    is forwarded to the API as the trusted tenant-resolution header below.
  if (process.env.NODE_ENV !== "production") {
    const explicitSlug = request.headers.get("x-tenant-slug");
    if (explicitSlug) {
      slug = explicitSlug.trim().toLowerCase();
    }
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

  // Inject tenant header into request. Always overwrite/clear whatever the
  // client sent so an unresolved slug can't fall through to the API as a
  // stale/attacker-controlled x-tenant-slug header.
  const requestHeaders = new Headers(request.headers);
  if (slug) {
    requestHeaders.set("x-tenant-slug", slug);
  } else {
    requestHeaders.delete("x-tenant-slug");
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
