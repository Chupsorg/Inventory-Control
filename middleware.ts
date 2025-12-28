import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("XSRF-TOKEN")?.value;
  const { pathname } = request.nextUrl;

  // 🔐 PROTECTED ROUTES
  const protectedRoutes = ["/orders","/history", "/config", "/primaryitems", "/cart"];

  // If NOT logged in and accessing protected route → login
  if (!token && protectedRoutes.some((path) => pathname.startsWith(path))) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If logged in and accessing login or home → orders
  if (token && (pathname === "/")) {
    return NextResponse.redirect(new URL("/orders", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/history/:path*", "/orders/:path*", "/config/:path*", "/primaryitems/:path*", "/cart/:path*"],
};

