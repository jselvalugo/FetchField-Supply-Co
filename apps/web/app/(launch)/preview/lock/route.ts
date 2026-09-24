import { NextResponse, type NextRequest } from "next/server";
import { PREVIEW_COOKIE } from "@/lib/preview";

export function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/coming-soon", req.url), 303);
  res.cookies.delete(PREVIEW_COOKIE);
  return res;
}
