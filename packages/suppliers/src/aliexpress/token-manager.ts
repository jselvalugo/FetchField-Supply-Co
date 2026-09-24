import { SupplierError } from "../errors";

export interface AeToken {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
  /** AliExpress account the token belongs to (for the admin "connected as" line). */
  account: string;
}

/**
 * Persistence for the single AliExpress token. Implementations MUST encrypt
 * tokens at rest (see TokenVault) and must not log them.
 */
export interface AeTokenStore {
  load(): Promise<AeToken | null>;
  save(token: AeToken): Promise<void>;
}

export interface AeTokenRefresher {
  refresh(refreshToken: string): Promise<AeToken>;
}

/** Refresh this long before expiry so a long sync run never straddles it. */
const REFRESH_MARGIN_MS = 24 * 60 * 60 * 1000;

/**
 * Hands out a valid access token, refreshing ahead of expiry. Concurrent
 * callers share one in-flight refresh (a refresh token is single-use on many
 * OAuth servers; two parallel refreshes can lock us out).
 */
export class AeTokenManager {
  private inflight: Promise<AeToken> | null = null;

  constructor(
    private readonly store: AeTokenStore,
    private readonly refresher: AeTokenRefresher,
    private readonly now: () => Date = () => new Date(),
    private readonly onAlert: (message: string) => void = () => {},
  ) {}

  async getAccessToken(): Promise<string> {
    const token = await this.store.load();
    if (!token) throw new SupplierError("auth", "AliExpress is not connected. An admin must authorize the app.");
    const now = this.now().getTime();
    if (token.accessExpiresAt.getTime() - now > REFRESH_MARGIN_MS) return token.accessToken;
    if (token.refreshExpiresAt.getTime() <= now) {
      this.onAlert("AliExpress refresh token expired. Re-authorize the app in Admin → Suppliers.");
      throw new SupplierError("auth", "AliExpress authorization expired");
    }
    return (await this.refreshOnce(token.refreshToken)).accessToken;
  }

  private refreshOnce(refreshToken: string): Promise<AeToken> {
    this.inflight ??= this.refresher
      .refresh(refreshToken)
      .then(async (fresh) => {
        await this.store.save(fresh);
        return fresh;
      })
      .catch((err: unknown) => {
        this.onAlert("AliExpress token refresh failed. Syncs are paused until it succeeds.");
        throw err;
      })
      .finally(() => {
        this.inflight = null;
      });
    return this.inflight;
  }
}
