import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const sessionCookie = request.cookies.get("tms_session");

  // Protected routes
  const isProtectedRoute = path.startsWith("/admin") || 
                          path.startsWith("/onboarding") ||
                          path.startsWith("/profile");

  // Admin-only routes
  const isAdminRoute = path.startsWith("/admin/onboarding");

  if (isProtectedRoute && !sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // For admin routes, we'll let the page-level auth handle the specific role checks
  // This is because we need to fetch user data from the database to check roles

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/onboarding/:path*", "/profile/:path*"]
};