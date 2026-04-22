import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require authentication
const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-2fa",
  "/oauth/google",
  "/oauth/linkedin",
  "/api/auth/callback/google",
  "/api/auth/callback/linkedin",
  "/health",
]);

function isPublicRoute(pathname: string): boolean {
  // Exact match
  if (PUBLIC_ROUTES.has(pathname)) return true;

  // Allow Next.js internals and static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return true;
  }

  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Check for access token
  const accessToken = request.cookies.get("techorbit-access-token")?.value;

  if (!accessToken) {
    // Allow access but redirect to login on the client side
    // We can't do server-side redirects easily with the Zustand store
    // So we pass a header that the client-side layout can read
    const response = NextResponse.next();
    response.headers.set("x-auth-required", "true");
    return response;
  }

  // Validate token format (basic JWT structure check)
  // Don't decode here — that happens client-side with the store
  const parts = accessToken.split(".");
  if (parts.length !== 3) {
    const response = NextResponse.next();
    response.headers.set("x-auth-required", "true");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|_next).*)",
  ],
};
