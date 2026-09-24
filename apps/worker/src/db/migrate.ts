import { readFileSync } from "node:fs";
import { loadWorkerEnv } from "../env";
import { createPool } from "./pool";

const sql = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
const pool = createPool(loadWorkerEnv().DATABASE_URL);
await pool.query(sql);
await pool.end();
console.log("schema applied");
