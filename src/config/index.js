import dotenv from "dotenv";

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

export default config;