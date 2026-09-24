import pg from "pg";

export type Db = Pick<pg.Pool, "query">;

export function createPool(url: string): pg.Pool {
  const u = new URL(url);
  const local = u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname.startsWith("/");
  // Managed Postgres (Railway/Render) must use TLS. Only a local dev database may skip it.
  return new pg.Pool({ connectionString: url, max: 5, ssl: local || u.searchParams.get("sslmode") === "disable" ? undefined : { rejectUnauthorized: true } });
}
