import { NextResponse, type NextRequest } from "next/server";
import { audit, listSignups } from "@/lib/server/data";
import { isAdmin } from "@/lib/server/require-admin";

/** CSV export. Cells starting with = + - @ are prefixed so spreadsheets don't run them as formulas. */
const cell = (v: string) => {
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return new NextResponse("Not found", { status: 404 });
  const a = req.nextUrl.searchParams.get("a");
  const rows = (await listSignups()).filter((s) => !a || s.audience === a);
  const csv = ["email,interested_in,joined_at,source", ...rows.map((s) => [s.email, s.audience, s.createdAt, s.source].map(cell).join(","))].join("\r\n");
  await audit("signups_exported", `${rows.length} rows`);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="fetchfield-launch-list-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
