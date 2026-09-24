/**
 * Turns whatever an admin pastes (a product URL, a mobile share link, or a bare
 * ID) into an AliExpress product ID. We extract the ID locally and then call
 * the API with it. We never fetch the pasted URL, so a pasted link can't make
 * the server request an arbitrary host.
 */
export function parseAliExpressProductId(input: string): string | null {
  const s = input.trim();
  if (/^\d{8,20}$/.test(s)) return s;
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();
  if (!(host === "aliexpress.com" || host.endsWith(".aliexpress.com") || host.endsWith(".aliexpress.us"))) return null;
  const path = /\/item\/(?:[^/]*\/)?(\d{8,20})\.html/.exec(url.pathname);
  if (path) return path[1]!;
  const q = url.searchParams.get("productId") ?? url.searchParams.get("product_id");
  return q && /^\d{8,20}$/.test(q) ? q : null;
}
