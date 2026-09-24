import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/admin-auth";

/**
 * Checks the admin session in every admin page, action and route handler.
 * The proxy checks it too; this is the second lock, so no admin code path
 * depends on the proxy alone.
 */
export async function requireAdmin(): Promise<void> {
  const jar = await cookies();
  if (!(await verifyAdminSession(jar.get(ADMIN_COOKIE)?.value))) redirect("/admin/login");
}
export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return verifyAdminSession(jar.get(ADMIN_COOKIE)?.value);
}
