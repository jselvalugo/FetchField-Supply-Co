import { z } from "zod";

const Env = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  SUPPLIER_TOKEN_KEYS: z.string().min(10),
  SHIP_TO: z.string().length(2).default("US"),
  CSV_SUPPLIERS: z.string().default(""), // "csv-acme=/secure/path/acme.csv,csv-b=/secure/path/b.csv"
});
export type WorkerEnv = z.infer<typeof Env>;

export function loadWorkerEnv(env: Record<string, string | undefined> = process.env): WorkerEnv {
  const r = Env.safeParse(env);
  if (!r.success) throw new Error(`Worker config invalid or missing: ${r.error.issues.map((i) => i.path.join(".")).join(", ")}`);
  return r.data;
}
