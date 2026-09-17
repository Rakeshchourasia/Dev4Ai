import AppError from "../../../shared/errors/AppError.js";
import {
  encrypt,
  decrypt,
} from "../../../shared/utils/tokenEncryption.js";
import githubConnectionRepository from "../repositories/githubConnection.repository.js";
import githubTokenService from "./githubToken.service.js";
import config from "../../../config/index.js";

class GithubConnectionService {
  // ==========================================
  // UPSERT GITHUB CONNECTION
  // Called from githubAuth.service.js after OAuth success
  // ==========================================

  /**
   * Encrypts and stores the GitHub OAuth credentials for a DEVAI user.
   *
   * @param {object} params
   * @param {string}      params.userId          — DEVAI user UUID
   * @param {string}      params.githubUserId     — GitHub numeric user ID (string)
   * @param {string}      params.githubUsername   — GitHub login/username
   * @param {string}      params.accessToken      — plaintext GitHub access token (NEVER log/return)
   * @param {string|null} params.refreshToken     — plaintext GitHub refresh token (nullable)
   * @param {string|null} params.scopes           — space-separated OAuth scopes
   * @param {object}      params.tokenData        — raw token response from GitHub (for expiry fields)
   * @param {object}      database                — drizzle db or transaction
   */
  async upsert(
    { userId, githubUserId, githubUsername, accessToken, refreshToken, scopes, tokenData },
    database
  ) {
    if (!userId || !githubUserId || !githubUsername || !accessToken) {
      throw new AppError(
        "userId, githubUserId, githubUsername, and accessToken are required to store a GitHub connection",
        500
      );
    }

    // Encrypt access token — throws if key is missing/invalid
    let accessTokenEncrypted;
    try {
      accessTokenEncrypted = encrypt(accessToken);
    } catch (err) {
      throw new AppError(
        `Failed to encrypt GitHub access token: ${err.message}`,
        500
      );
    }

    // Encrypt refresh token if present
    let refreshTokenEncrypted = null;
    if (refreshToken) {
      try {
        refreshTokenEncrypted = encrypt(refreshToken);
      } catch (err) {
        throw new AppError(
          `Failed to encrypt GitHub refresh token: ${err.message}`,
          500
        );
      }
    }

    // Parse token expiry from GitHub response if available (GitHub Apps return expires_in)
    let accessTokenExpiresAt = null;
    let refreshTokenExpiresAt = null;

    if (tokenData?.expires_in && typeof tokenData.expires_in === "number") {
      accessTokenExpiresAt = new Date(
        Date.now() + tokenData.expires_in * 1000
      );
    }

    if (
      tokenData?.refresh_token_expires_in &&
      typeof tokenData.refresh_token_expires_in === "number"
    ) {
      refreshTokenExpiresAt = new Date(
        Date.now() + tokenData.refresh_token_expires_in * 1000
      );
    }

    // If another account was previously connected to this GitHub user ID, clean it up
    // to avoid unique constraint conflict on github_user_id
    const existingByGithubId = await githubConnectionRepository.findByGithubUserId(
      githubUserId,
      database
    );
    if (existingByGithubId && existingByGithubId.userId !== userId) {
      await githubConnectionRepository.deleteByUserId(existingByGithubId.userId, database);
    }

    const record = await githubConnectionRepository.upsert(
      {
        userId,
        githubUserId: String(githubUserId),
        githubUsername,
        accessTokenEncrypted,
        refreshTokenEncrypted,
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
        scopes: scopes || null,
      },
      database
    );

    return record;
  }

  // ==========================================
  // GET CONNECTION (SAFE — no tokens)
  // ==========================================

  /**
   * Returns safe, public information about a user's GitHub connection.
   * Never exposes encrypted tokens or plaintext tokens.
   *
   * @param {string} userId — DEVAI user UUID (from JWT)
   * @returns {{ connected: boolean, github?: { id: string, username: string, avatarUrl: string, scopes: string|null, accessTokenExpiresAt: Date|null } }}
   */
  async getConnection(userId) {
    const record = await githubConnectionRepository.findByUserId(userId);

    if (!record) {
      return { connected: false };
    }

    // GitHub avatar URL is always public and deterministic from the numeric user ID
    const avatarUrl = `https://avatars.githubusercontent.com/u/${record.githubUserId}`;

    return {
      connected: true,
      github: {
        id: record.githubUserId,
        username: record.githubUsername,
        avatarUrl,
        scopes: record.scopes || null,
        tokenExpiresAt: record.accessTokenExpiresAt || null,
      },
    };
  }

  // ==========================================
  // DELETE CONNECTION
  // ==========================================

  /**
   * Removes the GitHub connection for a user.
   * Attempts to revoke the token on GitHub's side first (best-effort).
   * Does NOT delete the DEVAI user or the user_auth_accounts record.
   *
   * @param {string} userId — DEVAI user UUID (from JWT)
   */
  async deleteConnection(userId) {
    const record = await githubConnectionRepository.findByUserId(userId);

    if (!record) {
      throw new AppError("No GitHub connection found for this account", 404);
    }

    // Best-effort: attempt to revoke token on GitHub
    if (config.githubClientId && config.githubClientSecret) {
      try {
        // Decrypt so we can send the token to GitHub's revocation endpoint
        const plainAccessToken = decrypt(record.accessTokenEncrypted);

        const revokeUrl = `https://api.github.com/applications/${config.githubClientId}/token`;

        await fetch(revokeUrl, {
          method: "DELETE",
          headers: {
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "DEVAI-Backend",
            // GitHub token revocation uses HTTP Basic Auth with client credentials
            Authorization:
              "Basic " +
              Buffer.from(
                `${config.githubClientId}:${config.githubClientSecret}`
              ).toString("base64"),
          },
          body: JSON.stringify({ access_token: plainAccessToken }),
        });

        // We intentionally do not check the revocation response status —
        // if GitHub revocation fails (e.g. token already expired), we still
        // remove the local connection record.
      } catch {
        // Best-effort: log a warning but don't block local deletion
        console.warn(
          "[GithubConnectionService] Token revocation request to GitHub failed " +
            "(token may already be expired). Proceeding with local connection removal."
        );
      }
    }

    // Remove from local database
    await githubConnectionRepository.deleteByUserId(userId);
  }

  // ==========================================
  // GET DECRYPTED TOKEN (INTERNAL USE ONLY)
  // Delegates to githubTokenService for automatic refresh and expiry validation
  // ==========================================

  /**
   * Returns a valid, decrypted GitHub access token for a given user.
   * Delegates to githubTokenService.getValidAccessToken(userId).
   * FOR INTERNAL SERVER-SIDE USE ONLY — never expose in responses.
   *
   * @param {string} userId — DEVAI user UUID
   * @returns {Promise<string>} plaintext GitHub access token
   * @throws {AppError} if no connection or decryption/refresh fails
   */
  async getDecryptedAccessToken(userId) {
    return await githubTokenService.getValidAccessToken(userId);
  }
}

export default new GithubConnectionService();

