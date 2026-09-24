import { SupplierError } from "../errors";
import { redactUrl } from "./redact";

export interface SecureFetchOptions {
  /** Exact hostnames, or "*.example.com" for any subdomain. */
  allowHosts: readonly string[];
  timeoutMs?: number;
  /** Hard cap on response body size. Protects the worker from memory blowups. */
  maxBytes?: number;
  fetchImpl?: typeof fetch;
}

export function hostAllowed(hostname: string, allowHosts: readonly string[]): boolean {
  const host = hostname.toLowerCase();
  return allowHosts.some((rule) => {
    const r = rule.toLowerCase();
    if (r.startsWith("*.")) {
      const base = r.slice(2);
      return host.endsWith(`.${base}`);
    }
    return host === r;
  });
}

/**
 * The only way this package talks to the network.
 * - HTTPS only, to an explicit host allowlist (no SSRF via supplier-supplied URLs)
 * - Redirects are refused, so an allowlisted host can't bounce us elsewhere
 * - Timeout via AbortSignal, and a streamed byte cap
 * - Errors carry a redacted URL, never tokens or signatures
 */
export async function secureFetch(
  url: string,
  init: RequestInit,
  opts: SecureFetchOptions,
): Promise<{ status: number; headers: Headers; body: Uint8Array }> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new SupplierError("blocked", "Refused: malformed URL");
  }
  if (parsed.protocol !== "https:") throw new SupplierError("blocked", `Refused: non-HTTPS URL ${redactUrl(url)}`);
  if (parsed.username || parsed.password) throw new SupplierError("blocked", "Refused: credentials in URL");
  if (!hostAllowed(parsed.hostname, opts.allowHosts)) {
    throw new SupplierError("blocked", `Refused: host ${parsed.hostname} is not allowlisted`);
  }

  const doFetch = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const maxBytes = opts.maxBytes ?? 5 * 1024 * 1024;

  let res: Response;
  try {
    res = await doFetch(parsed, { ...init, redirect: "error", signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    throw new SupplierError("transient", `${timedOut ? "Timed out" : "Network error"} calling ${redactUrl(url)}`);
  }

  const declared = Number(res.headers.get("content-length") ?? "0");
  if (declared > maxBytes) throw new SupplierError("invalid_response", `Response too large (${declared} bytes)`);

  const body = await readCapped(res, maxBytes);
  return { status: res.status, headers: res.headers, body };
}

async function readCapped(res: Response, maxBytes: number): Promise<Uint8Array> {
  if (!res.body) return new Uint8Array();
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new SupplierError("invalid_response", `Response exceeded ${maxBytes} bytes`);
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}
