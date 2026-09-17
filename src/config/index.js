import dotenv from "dotenv";
import { validateEncryptionKey } from "../shared/utils/tokenEncryption.js";

dotenv.config();

const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  githubClientId: process.env.GITHUB_CLIENT_ID,
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
  githubCallbackUrl:
    process.env.GITHUB_CALLBACK_URL ||
    "http://127.0.0.1:3000/auth/github/callback",
  githubTokenEncryptionKey: process.env.GITHUB_TOKEN_ENCRYPTION_KEY,
  githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
};

/**
 * Validates required GitHub environment variables.
 * Never prints or leaks secret values in error messages or logs.
 */
export function validateGithubConfig() {
  const missing = [];
  if (!process.env.GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID.trim() === "") {
    missing.push("GITHUB_CLIENT_ID");
  }
  if (!process.env.GITHUB_CLIENT_SECRET || process.env.GITHUB_CLIENT_SECRET.trim() === "") {
    missing.push("GITHUB_CLIENT_SECRET");
  }
  if (!process.env.GITHUB_CALLBACK_URL || process.env.GITHUB_CALLBACK_URL.trim() === "") {
    missing.push("GITHUB_CALLBACK_URL");
  } else {
    try {
      new URL(process.env.GITHUB_CALLBACK_URL);
    } catch {
      throw new Error("GITHUB_CALLBACK_URL must be a valid URL");
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required GitHub environment variable(s): ${missing.join(", ")}`);
  }

  // Validates process.env.GITHUB_TOKEN_ENCRYPTION_KEY format (64 hex characters)
  validateEncryptionKey();
}

export default config;