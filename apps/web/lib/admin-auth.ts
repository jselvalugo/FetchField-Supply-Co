/**
 * Admin sessions. The cookie is "<expiry>.<HMAC(expiry)>", signed with a key
 * derived from ADMIN_SESSION_SECRET (or ADMIN_PASSWORD if that isn't set).
 * No password or user data is stored in the cookie. Changing either variable
 * signs everyone out. Web Crypto only, so it runs in the proxy too.
 */
import { safeEqual } from "./preview";

export const ADMIN_COOKIE = "ff_admin";
export const ADMIN_SESSION_HOURS = 12;

export const adminPassword = () => {
  const p = process.env.ADMIN_PASSWORD ?? "";
  return p.length >= 12 ? p : null;
};

async function hmac(secret: string, msg: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const secret = () => `${process.env.ADMIN_SESSION_SECRET ?? ""}|${adminPassword() ?? ""}|fetchfield-admin-v1`;

export async function createAdminSession(now = Date.now()) {
  const exp = Math.floor(now / 1000) + ADMIN_SESSION_HOURS * 3600;
  return `${exp}.${await hmac(secret(), `admin:${exp}`)}`;
}

export async function verifyAdminSession(value: string | undefined, now = Date.now()): Promise<boolean> {
  if (!value || !adminPassword()) return false;
  const [expStr, sig] = value.split(".");
  const exp = Number(expStr);
  if (!Number.isInteger(exp) || !sig || exp * 1000 < now) return false;
  return safeEqual(sig, await hmac(secret(), `admin:${exp}`));
}
