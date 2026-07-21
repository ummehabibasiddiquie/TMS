import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PAGE_PREFIXES = ["/login"];
const PUBLIC_API_PREFIXES = [
  "/api/auth/login",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
];

function isPublicPage(path: string) {
  return PUBLIC_PAGE_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`)
  );
}

function isPublicApi(path: string) {
  return PUBLIC_API_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`)
  );
}

function isStaticOrNext(path: string) {
  return (
    path.startsWith("/_next") ||
    path.startsWith("/favicon") ||
    path.startsWith("/images") ||
    path.startsWith("/uploads") ||
    /\.(?:ico|png|jpg|jpeg|gif|svg|webp|css|js|map|txt|xml|woff2?)$/i.test(path)
  );
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (isStaticOrNext(path)) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("tms_session");
  const hasSession = Boolean(sessionCookie?.value);

  if (path.startsWith("/api")) {
    if (isPublicApi(path)) {
      return NextResponse.next();
    }
    if (!hasSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (isPublicPage(path)) {
    return NextResponse.next();
  }

  // Protect all other app pages
  if (!hasSession) {
    const login = new URL("/login", request.url);
    if (path !== "/") {
      login.searchParams.set("next", path);
    }
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except Next internals that we already skip in-code.
     * Keeping a broad matcher so /api and role pages are covered.
     */
    "/((?!_next/static|_next/image).*)",
  ],
};
