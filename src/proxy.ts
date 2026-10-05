import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getAuthSecret } from "@/lib/auth-secret";

/**
 * Enterprise Next.js Security Proxy
 *
 * Enforces route-level authentication & role authorization:
 * 1. /order/:path* -> Strictly requires authentication. Unauthenticated users redirected to /login.
 * 2. /dashboard/:path* -> Strictly requires customer or admin authentication.
 * 3. /admin/:path* -> Strictly requires admin role; non-admins redirected to /dashboard.
 * 4. Auth pages (/login, /register, etc.) -> Authenticated users redirected to /dashboard.
 */
export async function proxy(req: NextRequest) {
  const { pathname, search, searchParams } = req.nextUrl;
  const isAdminRoute = pathname.startsWith("/admin");
  const isOrderRoute = pathname.startsWith("/order");
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");
  const token = isAdminRoute || isOrderRoute || isDashboardRoute || isAuthRoute
    ? await getToken({ req, secret: getAuthSecret() })
    : null;
  const isAuthenticated = Boolean(token && (token.id || token.email || token.sub));
  const isAdmin = token?.role === "admin";

  // 1. Guard legacy /admin routes - strictly require admin role
  if (isAdminRoute) {
    if (!isAuthenticated) {
      const loginUrl = new URL(`/login?callbackUrl=${encodeURIComponent("/dashboard")}`, req.url);
      return NextResponse.redirect(loginUrl);
    }
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 2. Guard protected customer & checkout routes
  if (isOrderRoute || isDashboardRoute) {
    if (!isAuthenticated) {
      const fullPath = pathname + (search || "");
      const callbackUrl = encodeURIComponent(fullPath);
      const loginUrl = new URL(`/login?callbackUrl=${callbackUrl}`, req.url);
      return NextResponse.redirect(loginUrl);
    }

    // 3. Guard against customer accessing admin-exclusive tabs via query parameters or direct URL paths
    if (isDashboardRoute && !isAdmin) {
      const requestedTab = searchParams.get("tab");
      const pathSegment = pathname.replace(/^\/dashboard\/?/, "").split("/")[0];
      const adminExclusiveTabs = new Set([
        "customers",
        "packages",
        "detergents",
        "coupons",
        "reviews",
        "faqs",
        "rates",
        "settings",
      ]);

      if ((requestedTab && adminExclusiveTabs.has(requestedTab)) || (pathSegment && adminExclusiveTabs.has(pathSegment))) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
  }

  // 4. Prevent already authenticated users from landing on auth pages (unless explicit error/logout)
  const isAuthErrorOrLogout = searchParams.has("error") || searchParams.has("logout");
  if (isAuthRoute && isAuthenticated && !isAuthErrorOrLogout) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const isDevelopment = process.env.NODE_ENV !== "production";
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' https://accounts.google.com https://js.stripe.com https://maps.googleapis.com${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "style-src-attr 'unsafe-inline'",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.googleusercontent.com https://*.supabase.co https://images.unsplash.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://accounts.google.com https://maps.googleapis.com",
    "frame-src 'self' https://js.stripe.com https://accounts.google.com https://maps.google.com https://www.google.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join("; ");
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export default proxy;

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|llms.txt|llms-full.txt).*)",
  ],
};
