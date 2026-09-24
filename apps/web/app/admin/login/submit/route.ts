import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, ADMIN_SESSION_HOURS, adminPassword, createAdminSession } from "@/lib/admin-auth";
import { safeEqual } from "@/lib/preview";
import { audit } from "@/lib/server/data";
import { isLimited, rateLimit } from "@/lib/server/rate-limit";

export async function POST(req: NextRequest) {
  const back = (error: string) => NextResponse.redirect(new URL(`/admin/login?error=${error}`, req.url), 303);
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return back("origin");
  // Only failed attempts count toward the lockout.
  if (await isLimited("admin-login", 5)) return back("slow");

  const pw = adminPassword();
  const form = await req.formData();
  if (!pw || !safeEqual(String(form.get("password") ?? ""), pw)) {
    await rateLimit("admin-login", 5, 15 * 60_000);
    await audit("login_failed", "Wrong admin password").catch(() => {});
    return back("wrong");
  }
  const nextRaw = String(form.get("next") ?? "/admin");
  const next = /^\/admin(\/[a-z0-9/_-]*)?$/i.test(nextRaw) ? nextRaw : "/admin";
  const res = NextResponse.redirect(new URL(next, req.url), 303);
  res.cookies.set(ADMIN_COOKIE, await createAdminSession(), {
    httpOnly: true,
    secure: req.nextUrl.protocol === "https:",
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_SESSION_HOURS * 3600,
  });
  await audit("login", "Admin signed in").catch(() => {});
  return res;
}
