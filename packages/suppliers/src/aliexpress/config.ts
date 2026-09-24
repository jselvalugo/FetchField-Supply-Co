import { z } from "zod";

/**
 * Server-side configuration for the AliExpress DS connection. Read once at
 * worker/backend startup; the app refuses to start with partial config
 * instead of failing on the first sync.
 *
 * None of these are ever exposed to the browser. In apps/web they must not be
 * prefixed NEXT_PUBLIC_, and the web app does not import this package's root.
 */
const EnvSchema = z.object({
  AE_APP_KEY: z.string().regex(/^\d{5,12}$/, "AE_APP_KEY should be the numeric app key"),
  AE_APP_SECRET: z.string().min(16),
  AE_REDIRECT_URI: z.string().url().refine((u) => u.startsWith("https://"), "must be https"),
  AE_API_BASE: z.string().url().default("https://api-sg.aliexpress.com"),
  AE_SHIP_TO: z.string().length(2).default("US"),
  AE_QPS: z.coerce.number().positive().max(50).default(5),
  SUPPLIER_TOKEN_KEYS: z.string().min(10),
});

export type AeConfig = z.infer<typeof EnvSchema>;

/** Hosts the AliExpress client may call. Anything else is refused. */
export const AE_API_HOSTS = ["api-sg.aliexpress.com"] as const;

/** Hosts supplier images may be downloaded from for re-hosting. */
export const AE_IMAGE_HOSTS = ["*.alicdn.com", "*.aliexpress-media.com"] as const;

export function loadAeConfig(env: Record<string, string | undefined> = process.env): AeConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    // List which keys are wrong, never their values.
    const keys = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`AliExpress config invalid or missing: ${keys}`);
  }
  const base = new URL(parsed.data.AE_API_BASE);
  if (base.protocol !== "https:" || !(AE_API_HOSTS as readonly string[]).includes(base.hostname)) {
    throw new Error("AE_API_BASE must be an allowlisted https host");
  }
  return parsed.data;
}
