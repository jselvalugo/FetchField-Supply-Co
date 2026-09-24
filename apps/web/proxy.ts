import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, adminPassword, verifyAdminSession } from "@/lib/admin-auth";
import { PREVIEW_COOKIE, previewPassword, previewToken, safeEqual } from "@/lib/preview";

/**
 * 1. /admin: 404 unless ADMIN_PASSWORD (12+ chars) is set. Every page except
 *    the login page needs a signed admin session.
 * 2. COMING_SOON=1: visitors see /coming-soon unless they unlocked the team
 *    preview or are signed in as admin. Fails closed.
 */
const OPEN_WHILE_SOON = ["/coming-soon", "/preview", "/preview/unlock", "/preview/lock", "/robots.txt", "/icon.svg", "/api/launch-list", "/api/stripe/webhook"];
const ADMIN_PUBLIC = ["/admin/login", "/admin/login/submit"];

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isAdminPath = path === "/admin" || path.startsWith("/admin/");
  const admin = await verifyAdminSession(req.cookies.get(ADMIN_COOKIE)?.value);

  if (isAdminPath) {
    if (!adminPassword()) return new NextResponse("Not found", { status: 404 });
    if (!admin && !ADMIN_PUBLIC.includes(path)) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = path === "/admin" ? "" : `?next=${encodeURIComponent(path)}`;
      return NextResponse.redirect(url, 303);
    }
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

  if (process.env.COMING_SOON === "1" && !OPEN_WHILE_SOON.includes(path) && !admin) {
    const pw = previewPassword();
    const cookie = req.cookies.get(PREVIEW_COOKIE)?.value ?? "";
    const unlocked = pw !== null && cookie !== "" && safeEqual(cookie, await previewToken(pw));
    if (!unlocked) {
      const url = req.nextUrl.clone();
      url.pathname = "/coming-soon";
      url.search = "";
      const res = NextResponse.rewrite(url);
      res.headers.set("Cache-Control", "no-store");
      return res;
    }
  }
  return NextResponse.next();
}

export const config = {
  // Everything except build assets and files with an extension (fonts, images).
  matcher: ["/((?!_next/static|_next/image|.*\\.[a-z0-9]+$).*)"],
};
