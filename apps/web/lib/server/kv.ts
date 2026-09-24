import "server-only";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Tiny JSON key-value layer. Production: Netlify Blobs (site-wide store, strong
 * consistency). Local dev and tests: JSON files under .data/. Keys look like
 * "signups/abc123"; list() takes a prefix.
 */
export interface Kv {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  del(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
}

const KEY_RE = /^[a-z0-9-]+(\/[A-Za-z0-9._-]+)+$/;
function checkKey(key: string) {
  if (!KEY_RE.test(key) || key.includes("..")) throw new Error(`Bad storage key: ${key}`);
}

function onNetlify() {
  return Boolean(process.env.NETLIFY_BLOBS_CONTEXT) || process.env.NETLIFY === "true";
}

async function netlifyKv(): Promise<Kv> {
  const { getStore } = await import("@netlify/blobs");
  const store = getStore({ name: "fetchfield", consistency: "strong" });
  return {
    get: async <T,>(key: string) => {
      checkKey(key);
      return ((await store.get(key, { type: "json" })) as T | null) ?? null;
    },
    set: async (key, value) => {
      checkKey(key);
      await store.setJSON(key, value);
    },
    del: async (key) => {
      checkKey(key);
      await store.delete(key);
    },
    list: async (prefix) => (await store.list({ prefix })).blobs.map((b) => b.key),
  };
}

function fileKv(root: string): Kv {
  const file = (key: string) => path.join(root, `${key}.json`);
  return {
    get: async <T,>(key: string) => {
      checkKey(key);
      try {
        return JSON.parse(await readFile(file(key), "utf8")) as T;
      } catch {
        return null;
      }
    },
    set: async (key, value) => {
      checkKey(key);
      await mkdir(path.dirname(file(key)), { recursive: true });
      await writeFile(file(key), JSON.stringify(value));
    },
    del: async (key) => {
      checkKey(key);
      await rm(file(key), { force: true });
    },
    list: async (prefix) => {
      const dir = path.join(root, prefix.replace(/\/$/, ""));
      try {
        return (await readdir(dir)).filter((f) => f.endsWith(".json")).map((f) => `${prefix.replace(/\/$/, "")}/${f.slice(0, -5)}`);
      } catch {
        return [];
      }
    },
  };
}

let cached: Promise<Kv> | null = null;
export function kv(): Promise<Kv> {
  cached ??= onNetlify() ? netlifyKv() : Promise.resolve(fileKv(process.env.FF_DATA_DIR ?? path.join(process.cwd(), ".data")));
  return cached;
}

/** Reads every document under a prefix. Fine at launch-list scale (thousands); page it later if needed. */
export async function readAll<T>(prefix: string): Promise<T[]> {
  const store = await kv();
  const keys = await store.list(prefix);
  const out: T[] = [];
  for (let i = 0; i < keys.length; i += 25) {
    const batch = await Promise.all(keys.slice(i, i + 25).map((k) => store.get<T>(k)));
    for (const b of batch) if (b) out.push(b);
  }
  return out;
}
