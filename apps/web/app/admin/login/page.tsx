import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@fetchfield/ui";
import { isAdmin } from "@/lib/server/require-admin";

const messages: Record<string, string> = {
  wrong: "That password didn't match.",
  slow: "Too many attempts. Wait 15 minutes and try again.",
  origin: "Open this page directly and try again.",
};

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  if (await isAdmin()) redirect("/admin");
  const msg = error ? messages[error] ?? "Something went wrong." : null;
  const safeNext = next && /^\/admin(\/[a-z0-9/_-]*)?$/i.test(next) ? next : "/admin";
  return (
    <main id="main" className="grid min-h-svh place-items-center bg-sunken px-4 py-12">
      <div className="w-full max-w-sm border-2 border-text bg-surface p-7">
        <Link href="/" aria-label="FetchField home"><Logo /></Link>
        <h1 className="display display--wide mt-8 mb-1 text-3xl">Admin</h1>
        <p className="mt-0 mb-6 text-sm text-muted">Orders, quotes, launch list and catalog.</p>
        <form method="post" action="/admin/login/submit" className="grid gap-4">
          <input type="hidden" name="next" value={safeNext} />
          <div className="field">
            <label htmlFor="pw">Admin password</label>
            <input id="pw" name="password" type="password" autoComplete="current-password" required autoFocus className="input"
              aria-invalid={Boolean(msg)} aria-describedby={msg ? "pw-err" : undefined} />
            {msg && <p id="pw-err" className="error-text m-0">{msg}</p>}
          </div>
          <button type="submit" className="ff-btn ff-btn--action ff-btn--lg">Sign in</button>
          <p className="m-0 text-xs text-muted">Sessions last 12 hours. Five wrong passwords lock this network out for 15 minutes.</p>
        </form>
      </div>
    </main>
  );
}
