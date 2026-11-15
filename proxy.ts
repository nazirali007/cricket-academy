import { NextResponse, type NextRequest } from "next/server";
import {
  safeAdminPath,
  SESSION_COOKIE,
  sessionCookieOptions,
  verifySessionToken,
} from "@/lib/admin-session";

// Turns signed-out visitors away from /admin before any page work starts, and
// keeps admin pages out of caches, frames and search engines. This is only a
// first check: every admin page, action and export checks the session again.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  const signedIn = verifySessionToken(cookie) !== null;
  const isLoginPage = pathname === "/admin/login";

  // Form submissions (server actions) check the session themselves.
  const isNavigation = request.method === "GET" || request.method === "HEAD";

  if (isNavigation && isLoginPage && signedIn) {
    return secure(NextResponse.redirect(
      new URL(safeAdminPath(request.nextUrl.searchParams.get("next")), request.url),
    ));
  }
  if (isNavigation && !isLoginPage && !signedIn) {
    const login = new URL("/admin/login", request.url);
    const target = pathname + search;
    if (target !== "/admin") login.searchParams.set("next", target);
    if (cookie) login.searchParams.set("expired", "1");
    const response = NextResponse.redirect(login);
    if (cookie) response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
    return secure(response);
  }
  return secure(NextResponse.next());
}

function secure(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "same-origin");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
