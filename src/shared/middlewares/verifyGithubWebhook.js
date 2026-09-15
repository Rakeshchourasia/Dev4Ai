import crypto from "node:crypto";
import AppError from "../errors/AppError.js";
import config from "../../config/index.js";

/**
 * Verifies the X-Hub-Signature-256 header using timing-safe HMAC comparison.
 * Rejects missing signatures (400), invalid signatures (401), and malformed payloads (400).
 */
export function verifyGithubWebhook(req, res, next) {
  try {
    const signature = req.headers["x-hub-signature-256"];
    if (!signature) {
      throw new AppError("GitHub webhook signature header is missing", 400);
    }

    const deliveryId = req.headers["x-github-delivery"];
    if (!deliveryId) {
      throw new AppError("GitHub delivery header is missing", 400);
    }

    const event = req.headers["x-github-event"];
    if (!event) {
      throw new AppError("GitHub event header is missing", 400);
    }

    const secret = config.githubWebhookSecret;
    if (!secret) {
      throw new AppError("GITHUB_WEBHOOK_SECRET is not configured", 500);
    }

    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));

    const expectedSignature = `sha256=${crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex")}`;

    const sigBuffer = Buffer.from(signature);
    const expBuffer = Buffer.from(expectedSignature);

    if (
      sigBuffer.length !== expBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expBuffer)
    ) {
      throw new AppError("Invalid GitHub webhook signature", 401);
    }

    // Validate payload is well-formed object
    if (!req.body || typeof req.body !== "object") {
      throw new AppError("Malformed webhook payload", 400);
    }

    next();
  } catch (error) {
    next(error);
  }
}
