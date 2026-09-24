import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Encrypts supplier OAuth tokens before they are written to the database.
 * AES-256-GCM with a key ring so keys can be rotated: new writes use the
 * active key, old rows still decrypt with retired keys until re-encrypted.
 *
 * Env format: SUPPLIER_TOKEN_KEYS="k2:base64key,k1:base64key" (first = active).
 * Generate a key: `openssl rand -base64 32`.
 *
 * Ciphertext is bound to its purpose via AAD, so an encrypted refresh token
 * can't be swapped into the access-token column.
 */
export class TokenVault {
  private readonly keys: Map<string, Buffer>;
  private readonly activeId: string;

  constructor(keyRing: string) {
    const entries = keyRing
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((pair) => {
        const idx = pair.indexOf(":");
        if (idx < 1) throw new Error("TokenVault: key entries must look like id:base64");
        const id = pair.slice(0, idx);
        if (!/^[a-z0-9_-]{1,16}$/i.test(id)) throw new Error("TokenVault: key id must be 1-16 chars [a-z0-9_-]");
        const key = Buffer.from(pair.slice(idx + 1), "base64");
        if (key.length !== 32) throw new Error(`TokenVault: key ${id} must be 32 bytes`);
        return [id, key] as const;
      });
    if (entries.length === 0) throw new Error("TokenVault: no keys configured");
    this.keys = new Map(entries);
    this.activeId = entries[0]![0];
  }

  encrypt(plaintext: string, purpose: string): string {
    const key = this.keys.get(this.activeId)!;
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(Buffer.from(purpose));
    const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return ["v1", this.activeId, iv.toString("base64url"), tag.toString("base64url"), ct.toString("base64url")].join(".");
  }

  decrypt(sealed: string, purpose: string): string {
    const [version, kid, iv, tag, ct] = sealed.split(".");
    if (version !== "v1" || !kid || !iv || !tag || ct === undefined) throw new Error("TokenVault: malformed ciphertext");
    const key = this.keys.get(kid);
    if (!key) throw new Error(`TokenVault: unknown key id ${kid}`);
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
    decipher.setAAD(Buffer.from(purpose));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]).toString("utf8");
  }

  /** True when the row was sealed with a retired key and should be re-encrypted. */
  needsRotation(sealed: string): boolean {
    return sealed.split(".")[1] !== this.activeId;
  }
}
