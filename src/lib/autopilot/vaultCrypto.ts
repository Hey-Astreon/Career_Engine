import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard 96-bit IV for GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Derives a consistent 32-byte (256-bit) encryption key.
 * Prioritizes CREDENTIAL_VAULT_KEY from env, or defensively derives
 * a stable 256-bit SHA-256 hash from NEXTAUTH_SECRET to prevent server
 * crashes during local development or staging.
 */
function getVaultKey(): Buffer {
  const customKey = process.env.CREDENTIAL_VAULT_KEY;
  if (customKey && customKey.length >= 32) {
    return Buffer.from(customKey.slice(0, 32), "utf8");
  }
  const secretSource = customKey || process.env.NEXTAUTH_SECRET || "astrework-credential-vault-secret-dev";
  return crypto.createHash("sha256").update(secretSource).digest();
}

/**
 * Encrypts a plaintext password using AES-256-GCM.
 * Output format: "hex(iv):hex(authTag):hex(ciphertext)"
 */
export function encryptPassword(plainText: string): string {
  if (!plainText) return "";
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getVaultKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM ciphertext payload back into plaintext.
 */
export function decryptPassword(cipherPayload: string): string {
  if (!cipherPayload) return "";
  try {
    const parts = cipherPayload.split(":");
    if (parts.length !== 3) {
      // In case legacy unencrypted or mismatched string was stored
      return cipherPayload;
    }
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const key = getVaultKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("[vaultCrypto] Decryption failed:", err);
    return "";
  }
}

/**
 * Generates an ATS-compliant, high-entropy password (16 characters)
 * Guaranteed to contain: Upper, Lower, Digits, and Special symbols.
 */
export function generateCompliantPassword(length = 16): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*_-+=";
  const all = upper + lower + digits + symbols;

  // Guarantee at least one of each class
  const passwordChars = [
    upper[crypto.randomInt(0, upper.length)],
    lower[crypto.randomInt(0, lower.length)],
    digits[crypto.randomInt(0, digits.length)],
    symbols[crypto.randomInt(0, symbols.length)],
  ];

  for (let i = passwordChars.length; i < length; i++) {
    passwordChars.push(all[crypto.randomInt(0, all.length)]);
  }

  // Cryptographically shuffle array using Fisher-Yates
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    const temp = passwordChars[i];
    passwordChars[i] = passwordChars[j];
    passwordChars[j] = temp;
  }

  return passwordChars.join("");
}
