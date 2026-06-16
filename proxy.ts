import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "./lib/jwt";

const AUTH_PATHS = ["/auth/sign-in", "/auth/sign-up"];

export function proxy(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const isAuthPath = AUTH_PATHS.some((path) =>
    req.nextUrl.pathname.startsWith(path),
  );

  let isAuthenticated = false;
  if (token) {
    try {
      verifyToken(token);
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  // Already logged in: sign-in/sign-up no longer make sense — resubmitting
  // the login form there would just create another redundant session row.
  if (isAuthPath) {
    return isAuthenticated
      ? NextResponse.redirect(new URL("/profile", req.url))
      : NextResponse.next();
  }

  // Every other route requires a valid access token.
  return isAuthenticated
    ? NextResponse.next()
    : NextResponse.redirect(new URL("/auth/sign-in", req.url));
}

export const config = {
  matcher: [
    /*
     * Match all paths except static/framework assets. /auth/* is now
     * included (unlike before) so authenticated users can be redirected
     * away from sign-in/sign-up instead of just letting them through.
     */
    "/((?!_next/static|_next/image|favicon\\.ico).*)",
  ],
};
