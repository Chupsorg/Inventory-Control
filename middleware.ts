import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const APP_ROOT = "/inventorymanagement";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  //PROTECTED ROUTES (relative to basePath)
  const protectedRoutes = [
    "/orders",
    "/history",
    "/config",
    "/primaryitems",
    "/cart",
  ];

  // No token + protected route → go to APP ROOT
  if (!token && protectedRoutes.some(path => pathname.startsWith(path))) {
    return NextResponse.redirect(
      new URL(APP_ROOT, request.url)
    );
  }

  //Token exists + visiting app root → orders
  if (token && pathname === "/") {
    return NextResponse.redirect(
      new URL(`${APP_ROOT}/orders`, request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/orders/:path*",
    "/history/:path*",
    "/config/:path*",
    "/primaryitems/:path*",
    "/cart/:path*",
  ],
};
