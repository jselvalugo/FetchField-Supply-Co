/** Query/body keys whose values must never reach logs, errors or the admin UI. */
const SECRET_KEYS = new Set([
  "sign",
  "app_key",
  "app_secret",
  "access_token",
  "refresh_token",
  "code",
  "client_secret",
  "authorization",
]);

/** Redacts secret query params in a URL string. */
export function redactUrl(input: string): string {
  try {
    const url = new URL(input);
    for (const key of [...url.searchParams.keys()]) {
      if (SECRET_KEYS.has(key.toLowerCase())) url.searchParams.set(key, "[redacted]");
    }
    return url.toString();
  } catch {
    return "[unparseable url]";
  }
}

/** Deep-redacts secret keys in a plain object (for structured logs). */
export function redact<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => redact(v)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_KEYS.has(k.toLowerCase()) ? "[redacted]" : redact(v);
    }
    return out as T;
  }
  return value;
}
