import { createHmac } from "node:crypto";

/**
 * AliExpress Open Platform request signing (sign_method=sha256).
 *
 * 1. Take every request parameter except `sign` (system + business params).
 * 2. Sort by parameter name, ASCII order.
 * 3. Concatenate name+value pairs with no separators.
 * 4. For "system" APIs called by path (e.g. /auth/token/create), prefix the path.
 * 5. HMAC-SHA256 with the app secret; hex, upper-case.
 *
 * Docs: https://openservice.aliexpress.com/doc/doc.htm (Signature algorithm)
 */
export function signRequest(params: Record<string, string>, appSecret: string, apiPath?: string): string {
  const base =
    (apiPath ?? "") +
    Object.keys(params)
      .filter((k) => k !== "sign")
      .sort()
      .map((k) => `${k}${params[k]}`)
      .join("");
  return createHmac("sha256", appSecret).update(base, "utf8").digest("hex").toUpperCase();
}
