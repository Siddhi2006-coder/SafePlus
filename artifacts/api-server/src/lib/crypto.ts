import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  createHash,
  randomBytes,
  scryptSync,
} from "node:crypto";

const ALGO = "aes-256-gcm";

let cachedKey: Buffer | null = null;
function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const explicit = process.env["MEDIA_ENC_KEY"];
  if (explicit && explicit.length >= 32) {
    cachedKey = createHash("sha256").update(explicit).digest();
    return cachedKey;
  }
  const seed =
    process.env["SESSION_SECRET"] ?? "safesphere-dev-fallback-key";
  cachedKey = scryptSync(seed, "safesphere/media/v1", 32);
  return cachedKey;
}

export type EncryptedBlob = {
  ciphertext: string; // base64
  iv: string; // hex
  authTag: string; // hex
};

export function encryptBase64Payload(plainBase64: string): EncryptedBlob {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const buf = Buffer.from(plainBase64, "base64");
  const enc = Buffer.concat([cipher.update(buf), cipher.final()]);
  return {
    ciphertext: enc.toString("base64"),
    iv: iv.toString("hex"),
    authTag: cipher.getAuthTag().toString("hex"),
  };
}

export function decryptBase64Payload(blob: EncryptedBlob): string {
  const key = getKey();
  const decipher = createDecipheriv(ALGO, key, Buffer.from(blob.iv, "hex"));
  decipher.setAuthTag(Buffer.from(blob.authTag, "hex"));
  const buf = Buffer.concat([
    decipher.update(Buffer.from(blob.ciphertext, "base64")),
    decipher.final(),
  ]);
  return buf.toString("base64");
}

/** Compact integrity tag for location points (lat, lng pinned to incident). */
export function locationDigest(
  incidentId: number,
  lat: number,
  lng: number,
): string {
  const seed =
    process.env["SESSION_SECRET"] ?? "safesphere-dev-fallback-key";
  return createHmac("sha256", seed)
    .update(`${incidentId}|${lat.toFixed(6)}|${lng.toFixed(6)}`)
    .digest("hex")
    .slice(0, 16);
}
