/**
 * tokenEncryption.js
 *
 * AES-256-GCM authenticated encryption for GitHub OAuth tokens.
 *
 * Key format: 64 hex characters (32 bytes) from GITHUB_TOKEN_ENCRYPTION_KEY env var.
 * Ciphertext format stored in DB: "<iv_base64>:<authTag_base64>:<ciphertext_base64>"
 *
 * IMPORTANT:
 * - Never log the key, plaintext token, or decrypted values.
 * - Never return encrypted or decrypted tokens in API responses.
 * - This module is for internal server-side storage only.
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
// GCM standard 96-bit IV for maximum security + performance
const IV_LENGTH = 12;
// GCM produces a 128-bit (16-byte) authentication tag
const AUTH_TAG_LENGTH = 16;

// ==========================================
// KEY VALIDATION
// ==========================================

/**
 * Validates that GITHUB_TOKEN_ENCRYPTION_KEY is set and is exactly 32 bytes
 * when decoded from hex. Call this once at application startup.
 *
 * @throws {Error} if the key is missing or has wrong length
 */
export function validateEncryptionKey() {
  const hexKey = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;

  if (!hexKey) {
    throw new Error(
      "GITHUB_TOKEN_ENCRYPTION_KEY is not set. " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }

  if (!/^[0-9a-fA-F]{64}$/.test(hexKey)) {
    throw new Error(
      "GITHUB_TOKEN_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
}

// ==========================================
// INTERNAL KEY HELPER
// ==========================================

/**
 * Returns the encryption key as a 32-byte Buffer.
 * Throws if key is not configured — fail fast rather than silently.
 *
 * @returns {Buffer}
 */
function getKey() {
  const hexKey = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;

  if (!hexKey || hexKey.length !== 64) {
    throw new Error(
      "GITHUB_TOKEN_ENCRYPTION_KEY is missing or invalid. " +
        "Cannot encrypt/decrypt tokens."
    );
  }

  return Buffer.from(hexKey, "hex");
}

// ==========================================
// ENCRYPT
// ==========================================

/**
 * Encrypts a plaintext string using AES-256-GCM.
 *
 * @param {string} plaintext  — the secret to encrypt (e.g. GitHub access token)
 * @returns {string}          — "<iv_b64>:<authTag_b64>:<ciphertext_b64>"
 * @throws {Error}            — if key is missing or encryption fails
 */
export function encrypt(plaintext) {
  if (typeof plaintext !== "string" || plaintext.length === 0) {
    throw new Error("encrypt() requires a non-empty string");
  }

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Delimiter is ":" — base64 standard (no padding issues with ":")
  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

// ==========================================
// DECRYPT
// ==========================================

/**
 * Decrypts a ciphertext produced by `encrypt()`.
 *
 * @param {string} payload  — "<iv_b64>:<authTag_b64>:<ciphertext_b64>"
 * @returns {string}        — the original plaintext
 * @throws {Error}          — if payload is malformed, key is wrong, or auth tag fails
 */
export function decrypt(payload) {
  if (typeof payload !== "string" || !payload) {
    throw new Error("decrypt() requires a non-empty string payload");
  }

  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error(
      "decrypt() received a malformed payload (expected 3 colon-separated parts)"
    );
  }

  const [ivB64, authTagB64, ciphertextB64] = parts;

  let iv, authTag, ciphertext;
  try {
    iv = Buffer.from(ivB64, "base64");
    authTag = Buffer.from(authTagB64, "base64");
    ciphertext = Buffer.from(ciphertextB64, "base64");
  } catch {
    throw new Error("decrypt() failed to decode base64 payload parts");
  }

  const key = getKey();

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    // Do NOT propagate the original error — it might reveal internal state
    throw new Error(
      "Token decryption failed. The token may be corrupt or the encryption key may have changed."
    );
  }
}
