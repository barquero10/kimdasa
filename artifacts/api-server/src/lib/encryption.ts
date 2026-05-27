import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const MIN_PAYLOAD_LENGTH = IV_LENGTH + AUTH_TAG_LENGTH + 1;
const ENCRYPTED_PREFIX = "enc:v1:";

function getKey(): Buffer {
  const raw = process.env["ENCRYPTION_KEY"];
  if (!raw) {
    throw new Error("ENCRYPTION_KEY environment variable is not set — credentials cannot be decrypted");
  }
  const key = Buffer.from(raw, "hex");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be a 64-character hex string (32 bytes) — check your secret configuration");
  }
  return key;
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, authTag, encrypted]).toString("base64");
  return `${ENCRYPTED_PREFIX}${payload}`;
}

export function decrypt(ciphertext: string): string {
  const key = getKey();
  const payload = Buffer.from(ciphertext.slice(ENCRYPTED_PREFIX.length), "base64");
  if (payload.length < MIN_PAYLOAD_LENGTH) {
    throw new Error(`Encrypted payload too short (${payload.length} bytes) — value may be corrupt`);
  }
  const iv = payload.subarray(0, IV_LENGTH);
  const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(ENCRYPTED_PREFIX);
}
