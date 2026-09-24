import { readFile } from "node:fs/promises";
import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import {
  AeClient,
  AeTokenManager,
  AliExpressAdapter,
  CsvSupplierAdapter,
  DEFAULT_RULE,
  TokenVault,
  loadAeConfig,
  redact,
  type SupplierAdapter,
} from "@fetchfield/suppliers";
import { loadWorkerEnv } from "./env";
import { createPool } from "./db/pool";
import { PgAlertSink, PgTokenStore } from "./db/repos";
import { forwardOrderJob, stalenessJob, stockPriceSyncJob, trackingPollJob, type JobDeps } from "./jobs";

/**
 * Worker entry point. Secrets are read from the environment once, validated,
 * and never logged. The web app never imports this process's code, and it
 * holds no supplier credentials.
 */
const env = loadWorkerEnv();
const db = createPool(env.DATABASE_URL);
const alerts = new PgAlertSink(db);
const vault = new TokenVault(env.SUPPLIER_TOKEN_KEYS);

const adapters = new Map<string, SupplierAdapter>();
if (process.env.AE_APP_KEY) {
  const ae = loadAeConfig();
  const tokens = new AeTokenManager(new PgTokenStore(db, vault), { refresh: (t) => client.refreshToken(t) }, undefined, (m) =>
    void alerts.alert({ level: "critical", code: "auth_expired", message: m }),
  );
  const client: AeClient = new AeClient({ config: ae, getAccessToken: () => tokens.getAccessToken() });
  adapters.set("aliexpress", new AliExpressAdapter(client));
}
for (const entry of env.CSV_SUPPLIERS.split(",").filter(Boolean)) {
  const [id, path] = entry.split("=");
  if (id && path) adapters.set(id, new CsvSupplierAdapter(id, () => readFile(path, "utf8")));
}

const deps: JobDeps = {
  db,
  adapters,
  alerts,
  rule: DEFAULT_RULE,
  shipTo: env.SHIP_TO,
  notify: async (orderId, kind) => console.info(`[notify] ${kind} ${orderId}`), // TODO: email provider
};

// BullMQ requires maxRetriesPerRequest: null on worker connections. rediss:// URLs use TLS.
const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
const QUEUE = "suppliers";
const queue = new Queue(QUEUE, { connection });

// Repeating schedules (spec §8.4, §8.5). Upserts are idempotent across restarts.
await queue.upsertJobScheduler("stock-price-6h", { pattern: "0 */6 * * *" }, { name: "stock-price" });
await queue.upsertJobScheduler("staleness-1h", { pattern: "15 * * * *" }, { name: "staleness" });
await queue.upsertJobScheduler("tracking-4h", { pattern: "30 */4 * * *" }, { name: "tracking" });

const worker = new Worker(
  QUEUE,
  async (job) => {
    switch (job.name) {
      case "stock-price":
        return stockPriceSyncJob(deps, (job.data as { variantIds?: string[] } | undefined)?.variantIds);
      case "staleness":
        return stalenessJob(deps);
      case "tracking":
        return trackingPollJob(deps);
      case "forward-order": {
        const out = await forwardOrderJob(deps, (job.data as { supplierOrderId: string }).supplierOrderId);
        // Retries are scheduled here, not by BullMQ's generic retry, so the attempt count lives in Postgres.
        if (out.kind === "retry") await queue.add("forward-order", job.data, { delay: out.delayMs, jobId: `${job.data.supplierOrderId}-r${Date.now()}` });
        return out;
      }
      default:
        throw new Error(`Unknown job ${job.name}`);
    }
  },
  { connection, concurrency: 2 },
);

worker.on("failed", (job, err) => console.error(`[job] ${job?.name} failed:`, redact({ message: err.message })));
console.info(`worker up: adapters=[${[...adapters.keys()].join(", ")}]`);

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, async () => {
    await worker.close();
    await queue.close();
    await connection.quit();
    await db.end();
    process.exit(0);
  });
}
