import { NextResponse, type NextRequest } from "next/server";
import { PREVIEW_COOKIE, PREVIEW_MAX_AGE, previewPassword, previewToken, safeEqual } from "@/lib/preview";
import { isLimited, rateLimit } from "@/lib/server/rate-limit";

export async function POST(req: NextRequest) {
  const back = (error: string) => NextResponse.redirect(new URL(`/preview?error=${error}`, req.url), 303);
  // Only accept posts from our own form.
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return back("origin");
  if (await isLimited("preview", 8)) return back("slow");

  const pw = previewPassword();
  const given = String((await req.formData()).get("password") ?? "");
  if (!pw || !safeEqual(given, pw)) {
    await rateLimit("preview", 8, 15 * 60_000);
    return back("wrong");
  }

  const res = NextResponse.redirect(new URL("/", req.url), 303);
  res.cookies.set(PREVIEW_COOKIE, await previewToken(pw), {
    httpOnly: true,
    secure: req.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: PREVIEW_MAX_AGE,
  });
  return res;
}
