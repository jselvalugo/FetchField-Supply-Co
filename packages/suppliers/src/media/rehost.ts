import { createHash } from "node:crypto";
import { SupplierError } from "../errors";
import { secureFetch } from "../http/secure-fetch";

export interface ImageStore {
  /** Stores bytes under a content-addressed key and returns our CDN URL. */
  put(key: string, bytes: Uint8Array, contentType: string): Promise<string>;
}

const SIGNATURES: Array<{ type: string; ext: string; test: (b: Uint8Array) => boolean }> = [
  { type: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    type: "image/png",
    ext: "png",
    test: (b) => [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v),
  },
  {
    type: "image/webp",
    ext: "webp",
    test: (b) =>
      String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP",
  },
];

/** Identifies an image by its bytes, not by the server's Content-Type (which we don't trust). */
export function sniffImage(bytes: Uint8Array): { type: string; ext: string } | null {
  const hit = SIGNATURES.find((s) => s.test(bytes));
  return hit ? { type: hit.type, ext: hit.ext } : null;
}

/**
 * Downloads one supplier image and re-hosts it (spec §8.3 step 4).
 * - Only from allowlisted supplier CDNs, HTTPS, no redirects (SSRF-safe)
 * - Max 10 MB, and the bytes must really be a JPEG/PNG/WebP (SVG is refused:
 *   it can carry script)
 * - Stored under a SHA-256 key, so the supplier's URL and filename never
 *   appear on our site
 *
 * Watermark/branding removal is a manual, rights-checked step and does not happen here.
 */
export async function rehostImage(
  url: string,
  store: ImageStore,
  opts: { allowHosts: readonly string[]; fetchImpl?: typeof fetch },
): Promise<{ url: string; sha256: string; contentType: string }> {
  const normalized = url.startsWith("//") ? `https:${url}` : url;
  const res = await secureFetch(
    normalized,
    { method: "GET", headers: { accept: "image/jpeg,image/png,image/webp" } },
    { allowHosts: opts.allowHosts, timeoutMs: 20_000, maxBytes: 10 * 1024 * 1024, fetchImpl: opts.fetchImpl },
  );
  if (res.status !== 200) throw new SupplierError("transient", `Image fetch HTTP ${res.status}`);
  const kind = sniffImage(res.body);
  if (!kind) throw new SupplierError("invalid_response", "Downloaded file is not a JPEG, PNG or WebP image");
  const sha256 = createHash("sha256").update(res.body).digest("hex");
  const stored = await store.put(`products/${sha256}.${kind.ext}`, res.body, kind.type);
  return { url: stored, sha256, contentType: kind.type };
}
