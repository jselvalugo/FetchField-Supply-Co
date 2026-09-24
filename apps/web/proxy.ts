import { NextResponse, type NextRequest } from "next/server";

/**
 * Gate for /admin. With ADMIN_USER / ADMIN_PASSWORD unset, /admin does not
 * exist (404), so a misconfigured deploy fails closed. Basic auth is
 * a stopgap for the preview; production admin runs behind SSO in Medusa.
 */
function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i % (a.length || 1)) || 0) ^ (b.charCodeAt(i % (b.length || 1)) || 0);
  return diff === 0;
}

export function proxy(req: NextRequest) {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASSWORD;
  if (!user || !pass || pass.length < 12) {
    return new NextResponse("Not found", { status: 404 });
  }
  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    let decoded = "";
    try {
      decoded = atob(header.slice(6));
    } catch {
      decoded = "";
    }
    const idx = decoded.indexOf(":");
    if (idx > 0 && safeEqual(decoded.slice(0, idx), user) && safeEqual(decoded.slice(idx + 1), pass)) {
      const res = NextResponse.next();
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
      res.headers.set("Cache-Control", "no-store");
      return res;
    }
  }
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="FetchField admin", charset="UTF-8"', "Cache-Control": "no-store" },
  });
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
