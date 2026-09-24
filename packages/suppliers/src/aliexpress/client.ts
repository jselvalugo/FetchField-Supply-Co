import { z } from "zod";
import { SupplierError } from "../errors";
import { CircuitBreaker, RateLimiter } from "../http/guards";
import { secureFetch } from "../http/secure-fetch";
import { AE_API_HOSTS, type AeConfig } from "./config";
import { signRequest } from "./sign";
import type { AeToken, AeTokenRefresher } from "./token-manager";

export interface AeClientDeps {
  config: Pick<AeConfig, "AE_APP_KEY" | "AE_APP_SECRET" | "AE_API_BASE" | "AE_QPS">;
  getAccessToken: () => Promise<string>;
  fetchImpl?: typeof fetch;
  now?: () => number;
  limiter?: RateLimiter;
  breaker?: CircuitBreaker;
}

const ErrorEnvelope = z.object({
  code: z.union([z.string(), z.number()]).optional(),
  type: z.string().optional(),
  message: z.string().optional(),
  msg: z.string().optional(),
  sub_code: z.string().optional(),
  sub_msg: z.string().optional(),
  request_id: z.string().optional(),
});

const TokenResponse = z.object({
  access_token: z.string().min(10),
  refresh_token: z.string().min(10),
  expire_time: z.coerce.number().optional(),
  expires_in: z.coerce.number().optional(),
  refresh_token_valid_time: z.coerce.number().optional(),
  refresh_expires_in: z.coerce.number().optional(),
  account: z.string().optional(),
  user_nick: z.string().optional(),
});

/** Maps an AliExpress error envelope to one of our error kinds. */
export function classifyAeError(e: z.infer<typeof ErrorEnvelope>): SupplierError {
  const code = String(e.code ?? "");
  const sub = e.sub_code ?? "";
  const text = [e.message ?? e.msg, e.sub_msg].filter(Boolean).join(" / ") || "AliExpress error";
  const details = { adapterId: "aliexpress", code: sub || code };
  if (/IllegalAccessToken|InvalidSession|IncompleteSignature|IllegalAppKey|^27$|^25$/i.test(code + sub)) {
    return new SupplierError("auth", `AliExpress auth error: ${text}`, details);
  }
  if (/ApiCallLimit|AppCallLimit|Frequency|^7$/i.test(code + sub)) {
    return new SupplierError("rate_limited", `AliExpress throttled: ${text}`, { ...details, retryAfterMs: 2_000 });
  }
  if (/^isp\.|ServiceUnavailable|RemoteServiceError|^15$/i.test(sub || code) && !/^isv\./i.test(sub)) {
    return new SupplierError("transient", `AliExpress service error: ${text}`, details);
  }
  return new SupplierError("rejected", `AliExpress rejected request: ${text}`, details);
}

/**
 * Thin, typed transport for the AliExpress Open Platform.
 *
 * Security properties:
 * - Params (including access_token and sign) go in a form-encoded POST body,
 *   not the URL, so they don't end up in proxy or access logs.
 * - Every request is HMAC-SHA256 signed with the app secret, which stays in
 *   this process and is never sent.
 * - Calls are rate-limited and circuit-broken; responses are size-capped and
 *   must be JSON; callers validate business payloads with zod.
 */
export class AeClient {
  private readonly limiter: RateLimiter;
  private readonly breaker: CircuitBreaker;
  private readonly now: () => number;

  constructor(private readonly deps: AeClientDeps) {
    this.limiter = deps.limiter ?? new RateLimiter(deps.config.AE_QPS);
    this.breaker = deps.breaker ?? new CircuitBreaker();
    this.now = deps.now ?? Date.now;
  }

  /** Calls a business API (e.g. aliexpress.ds.product.get). Returns parsed JSON. */
  async call(method: string, params: Record<string, string>): Promise<unknown> {
    if (!/^aliexpress\.[a-z0-9_.]+$/i.test(method)) throw new SupplierError("blocked", `Refused: unexpected method ${method}`);
    const accessToken = await this.deps.getAccessToken();
    const all: Record<string, string> = {
      ...params,
      method,
      app_key: this.deps.config.AE_APP_KEY,
      access_token: accessToken,
      sign_method: "sha256",
      timestamp: String(this.now()),
    };
    all.sign = signRequest(all, this.deps.config.AE_APP_SECRET);
    return this.post("/sync", all);
  }

  /** Exchanges an OAuth `code` (from the admin authorize redirect) for tokens. */
  async createToken(code: string): Promise<AeToken> {
    return this.systemTokenCall("/auth/token/create", { code });
  }

  async refreshToken(refreshToken: string): Promise<AeToken> {
    return this.systemTokenCall("/auth/token/refresh", { refresh_token: refreshToken });
  }

  asRefresher(): AeTokenRefresher {
    return { refresh: (t) => this.refreshToken(t) };
  }

  /** The URL an admin opens to connect our AliExpress DS account. `state` must be a CSRF nonce. */
  static authorizeUrl(appKey: string, redirectUri: string, state: string): string {
    const u = new URL("https://api-sg.aliexpress.com/oauth/authorize");
    u.searchParams.set("response_type", "code");
    u.searchParams.set("force_auth", "true");
    u.searchParams.set("client_id", appKey);
    u.searchParams.set("redirect_uri", redirectUri);
    u.searchParams.set("state", state);
    return u.toString();
  }

  private async systemTokenCall(path: string, params: Record<string, string>): Promise<AeToken> {
    const all: Record<string, string> = {
      ...params,
      app_key: this.deps.config.AE_APP_KEY,
      sign_method: "sha256",
      timestamp: String(this.now()),
    };
    all.sign = signRequest(all, this.deps.config.AE_APP_SECRET, path);
    const json = await this.post(`/rest${path}`, all);
    const parsed = TokenResponse.safeParse(json);
    if (!parsed.success) throw new SupplierError("auth", "AliExpress token response was not usable");
    const t = parsed.data;
    const now = this.now();
    const accessExp = t.expire_time ?? now + (t.expires_in ?? 0) * 1000;
    const refreshExp = t.refresh_token_valid_time ?? now + (t.refresh_expires_in ?? 0) * 1000;
    return {
      accessToken: t.access_token,
      refreshToken: t.refresh_token,
      accessExpiresAt: new Date(accessExp),
      refreshExpiresAt: new Date(refreshExp),
      account: t.account ?? t.user_nick ?? "unknown",
    };
  }

  private async post(path: string, params: Record<string, string>): Promise<unknown> {
    await this.limiter.take();
    return this.breaker.run(async () => {
      const res = await secureFetch(
        `${this.deps.config.AE_API_BASE}${path}`,
        {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded;charset=utf-8", accept: "application/json" },
          body: new URLSearchParams(params).toString(),
        },
        { allowHosts: AE_API_HOSTS, timeoutMs: 20_000, maxBytes: 4 * 1024 * 1024, fetchImpl: this.deps.fetchImpl },
      );
      if (res.status === 429) throw new SupplierError("rate_limited", "AliExpress HTTP 429", { retryAfterMs: 5_000 });
      if (res.status >= 500) throw new SupplierError("transient", `AliExpress HTTP ${res.status}`);
      let json: unknown;
      try {
        json = JSON.parse(new TextDecoder().decode(res.body));
      } catch {
        throw new SupplierError("invalid_response", `AliExpress returned non-JSON (HTTP ${res.status})`);
      }
      const envelope = extractError(json);
      if (envelope) throw classifyAeError(envelope);
      if (res.status >= 400) throw new SupplierError("rejected", `AliExpress HTTP ${res.status}`);
      return json;
    });
  }
}

function extractError(json: unknown): z.infer<typeof ErrorEnvelope> | null {
  if (!json || typeof json !== "object") return null;
  const obj = json as Record<string, unknown>;
  if (obj.error_response) {
    const p = ErrorEnvelope.safeParse(obj.error_response);
    return p.success ? p.data : { message: "Unrecognised error_response" };
  }
  // The /sync and /rest gateways put errors at top level with a non-zero code.
  if ("code" in obj && String(obj.code) !== "0" && ("message" in obj || "type" in obj)) {
    const p = ErrorEnvelope.safeParse(obj);
    return p.success ? p.data : null;
  }
  return null;
}
