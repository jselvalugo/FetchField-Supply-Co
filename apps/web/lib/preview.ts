/**
 * Team preview while the public sees /coming-soon.
 * The cookie holds an HMAC of the password, never the password itself, so it
 * can't be reversed. Changing PREVIEW_PASSWORD logs everyone out.
 * Uses Web Crypto only, so it runs in the proxy and in route handlers alike.
 */
export const PREVIEW_COOKIE = "ff_preview";
export const PREVIEW_MAX_AGE = 60 * 60 * 24 * 30;

export async function previewToken(password: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("fetchfield-preview-v1"));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Length-independent constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export const previewPassword = () => {
  const p = process.env.PREVIEW_PASSWORD ?? "";
  return p.length >= 10 ? p : null;
};
