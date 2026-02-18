import { NextResponse } from "next/server";

export function middleware(req) {
  // Normalize pathname to lowercase
  const { pathname } = req.nextUrl;
  const normalizedPath = pathname.toLowerCase();

  // Get the user role from cookies and normalize it to lowercase
  const role = req.cookies.get("user_role")?.value?.toLowerCase();

  // 1. If not logged in and accessing protected routes
  const isProtectedRoute =
    normalizedPath.startsWith("/admindashboard") ||
    normalizedPath.startsWith("/staffdashboard");

  // Logout functionality (clear cookies and redirect to login)
  if (normalizedPath === "/logout") {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.set("user_role", "", { path: "/", expires: new Date(0) }); // fully clear cookie
    return res;
  }

  // 2. If not logged in and accessing protected routes, redirect to login
  if (!role && isProtectedRoute) {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.set("user_role", "", { path: "/", expires: new Date(0) }); // fully clear
    return res;
  }

  // 4. Role-based route protection
  if (normalizedPath.startsWith("/admindashboard") && role !== "admin") {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.set("user_role", "", { path: "/", expires: new Date(0) });
    return res;
  }
  if (normalizedPath.startsWith("/staffdashboard") && role !== "staff") {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.set("user_role", "", { path: "/", expires: new Date(0) });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/logout",  // Add logout as a valid route for the middleware
    "/admindashboard/:path*",
    "/staffdashboard/:path*",
  ],
};
