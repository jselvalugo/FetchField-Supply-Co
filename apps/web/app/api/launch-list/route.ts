import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { addSignup } from "@/lib/server/data";
import { rateLimit } from "@/lib/server/rate-limit";

const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  audience: z.enum(["parks", "dog", "both"]).default("both"),
  website: z.string().max(0).optional(), // honeypot must stay empty
});

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ ok: false }, { status: 403 });
  if (!(await rateLimit("launch-list", 10, 10 * 60_000))) return NextResponse.json({ ok: false, error: "slow" }, { status: 429 });
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    // A filled honeypot gets a fake success so bots don't learn anything.
    if (json && typeof json === "object" && "website" in json && (json as { website?: string }).website) return NextResponse.json({ ok: true });
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  await addSignup(parsed.data.email, parsed.data.audience, "coming-soon");
  // Same answer whether new or already on the list, so the form can't be used to probe emails.
  return NextResponse.json({ ok: true });
}
