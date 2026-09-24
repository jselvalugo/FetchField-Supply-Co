import { randomBytes, timingSafeEqual } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { AeClient, TokenVault, loadAeConfig } from "@fetchfield/suppliers";
import { loadWorkerEnv } from "./env";
import { createPool } from "./db/pool";
import { PgTokenStore } from "./db/repos";

/**
 * One-time admin step: authorize our AliExpress DS account.
 * 1. Prints the authorize URL with a random `state` (CSRF protection).
 * 2. The admin approves in the browser and pastes back the full redirect URL.
 * 3. We check `state`, exchange the one-time code, and store the tokens encrypted.
 * The code and tokens are never printed.
 */
const ae = loadAeConfig();
const env = loadWorkerEnv();
const state = randomBytes(24).toString("base64url");
console.log("\nOpen this URL, sign in to the FetchField AliExpress account, and approve:\n");
console.log(AeClient.authorizeUrl(ae.AE_APP_KEY, ae.AE_REDIRECT_URI, state), "\n");

const rl = createInterface({ input: process.stdin, output: process.stdout });
const pasted = (await rl.question("Paste the full URL you were redirected to: ")).trim();
rl.close();

const url = new URL(pasted);
const back = url.searchParams.get("state") ?? "";
if (back.length !== state.length || !timingSafeEqual(Buffer.from(back), Buffer.from(state))) {
  throw new Error("State mismatch: this redirect wasn't started by this session. Nothing was saved.");
}
if (!url.href.startsWith(ae.AE_REDIRECT_URI)) throw new Error("Redirect URL doesn't match AE_REDIRECT_URI. Nothing was saved.");
const code = url.searchParams.get("code");
if (!code) throw new Error("No authorization code in the URL.");

// Token creation is a signed system call and needs no access token yet.
const client = new AeClient({ config: ae, getAccessToken: async () => "" });
const token = await client.createToken(code);
const db = createPool(env.DATABASE_URL);
await new PgTokenStore(db, new TokenVault(env.SUPPLIER_TOKEN_KEYS)).save(token);
await db.end();
console.log(`Connected as ${token.account}. Access token valid until ${token.accessExpiresAt.toISOString()}.`);
