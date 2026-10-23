import { describe, it, expect } from "vitest";
import {
  encryptPassword,
  decryptPassword,
  generateCompliantPassword,
} from "../src/lib/autopilot/vaultCrypto";

describe("AstrePilot Vault Crypto & Password Engine", () => {
  it("should encrypt and decrypt passwords losslessly via AES-256-GCM", () => {
    const originalPassword = "Secret!Password@2026";
    const encrypted = encryptPassword(originalPassword);

    expect(encrypted).not.toBe(originalPassword);
    expect(encrypted).toContain(":");
    const parts = encrypted.split(":");
    expect(parts.length).toBe(3); // iv, authTag, ciphertext

    const decrypted = decryptPassword(encrypted);
    expect(decrypted).toBe(originalPassword);
  });

  it("should generate cryptographically compliant 16-character passwords meeting ATS requirements", () => {
    const password = generateCompliantPassword(16);
    expect(password.length).toBe(16);

    // Must contain uppercase, lowercase, digits, and special characters
    expect(/[A-Z]/.test(password)).toBe(true);
    expect(/[a-z]/.test(password)).toBe(true);
    expect(/[0-9]/.test(password)).toBe(true);
    expect(/[!@#$%^&*_\-+=]/.test(password)).toBe(true);
  });

  it("should produce distinct ciphertexts for identical plaintexts (random IV)", () => {
    const pwd = "Cotiviti#Password$800024";
    const enc1 = encryptPassword(pwd);
    const enc2 = encryptPassword(pwd);

    expect(enc1).not.toBe(enc2);
    expect(decryptPassword(enc1)).toBe(pwd);
    expect(decryptPassword(enc2)).toBe(pwd);
  });
});
