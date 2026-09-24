import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@fetchfield/ui";

export const metadata: Metadata = { title: "Team preview", robots: { index: false, follow: false } };

const messages: Record<string, string> = {
  wrong: "That password didn't match.",
  slow: "Too many tries. Wait 15 minutes and try again.",
  origin: "Open this page directly and try again.",
};

export default async function Preview({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const msg = error ? messages[error] ?? "Something went wrong." : null;
  return (
    <main id="main" className="turf on-dark grid min-h-svh place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/coming-soon" aria-label="FetchField home"><Logo inverse /></Link>
        <h1 className="display display--wide mt-10 mb-2 text-3xl">Team preview</h1>
        <p className="mt-0 mb-6 text-sm text-muted">The full site with sample data, for the FetchField team. The public sees the Coming Soon page.</p>
        <form method="post" action="/preview/unlock" className="grid gap-4">
          <div className="field">
            <label htmlFor="pw">Preview password</label>
            <input id="pw" name="password" type="password" autoComplete="current-password" required className="input !bg-transparent !text-[var(--chalk)]"
              aria-invalid={Boolean(msg)} aria-describedby={msg ? "pw-err" : undefined} />
            {msg && <p id="pw-err" className="m-0 text-sm font-semibold text-[#F2B8A0]">{msg}</p>}
          </div>
          <button type="submit" className="ff-btn ff-btn--action ff-btn--lg">Open the preview</button>
        </form>
      </div>
    </main>
  );
}
