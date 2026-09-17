/**
 * githubToken.service.js
 *
 * Dedicated GitHub token management service.
 * Handles:
 *   - Secure token retrieval and on-demand decryption
 *   - Automatic token refresh before expiration (60s safety buffer)
 *   - Refresh token rotation (GitHub user-to-server expiring tokens)
 *   - Encrypted persistence of refreshed credentials
 *   - Graceful cleanup and 401 error handling for expired/revoked connections
 *   - In-flight refresh request deduplication to prevent rotation race conditions
 *
 * SECURITY:
 *   - Plaintext and encrypted tokens are NEVER logged.
 *   - Plaintext and encrypted tokens are NEVER returned in API responses.
 *   - Plaintext tokens are returned only to internal server-side callers.
 */

import AppError from "../../../shared/errors/AppError.js";
import config from "../../../config/index.js";
import { encrypt, decrypt } from "../../../shared/utils/tokenEncryption.js";
import githubConnectionRepository from "../repositories/githubConnection.repository.js";

const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
// Safety buffer: refresh if token expires within 60 seconds
const EXPIRY_BUFFER_MS = 60 * 1000;

class GithubTokenService {
  constructor() {
    // Map to deduplicate concurrent refresh operations per userId
    this.refreshQueue = new Map();
  }

  /**
   * Retrieves a valid, decrypted GitHub access token for the given user.
   * Automatically refreshes the token if it is expired or close to expiring.
   *
   * @param {string} userId - DEVAI user UUID
   * @returns {Promise<string>} Plaintext GitHub access token
   * @throws {AppError} 404 if connection not found, 401 if expired/unusable
   */
  async getValidAccessToken(userId) {
    if (!userId) {
      throw new AppError("User ID is required to retrieve GitHub access token", 400);
    }

    // 1. Load the connection record
    const record = await githubConnectionRepository.findByUserId(userId);
    if (!record) {
      throw new AppError(
        "No GitHub connection found. Please reconnect your GitHub account.",
        404
      );
    }

    // 2. Check if access token has an expiration timestamp
    // Classic GitHub OAuth tokens have no expiration (accessTokenExpiresAt is null)
    if (!record.accessTokenExpiresAt) {
      try {
        return decrypt(record.accessTokenEncrypted);
      } catch (err) {
        throw new AppError(
          `Failed to decrypt stored GitHub access token: ${err.message}`,
          500
        );
      }
    }

    // 3. Check if token is still valid beyond the 60-second safety buffer
    const expiresAtMs = new Date(record.accessTokenExpiresAt).getTime();
    const nowMs = Date.now();
    const isStillValid = expiresAtMs - nowMs > EXPIRY_BUFFER_MS;

    if (isStillValid) {
      try {
        return decrypt(record.accessTokenEncrypted);
      } catch (err) {
        throw new AppError(
          `Failed to decrypt stored GitHub access token: ${err.message}`,
          500
        );
      }
    }

    // 4. Token is expired or about to expire — refresh is required
    // If a refresh for this user is already in-flight, await the same promise
    if (this.refreshQueue.has(userId)) {
      return await this.refreshQueue.get(userId);
    }

    const refreshPromise = this._refreshToken(userId, record);
    this.refreshQueue.set(userId, refreshPromise);

    try {
      return await refreshPromise;
    } finally {
      this.refreshQueue.delete(userId);
    }
  }

  /**
   * Internal method to execute token refresh via GitHub OAuth endpoint.
   * Handles token rotation, DB updates, and cleanup on failure.
   *
   * @private
   * @param {string} userId - DEVAI user UUID
   * @param {object} record - Current github_connections DB record
   * @returns {Promise<string>} New plaintext access token
   */
  async _refreshToken(userId, record) {
    // If no refresh token exists, the connection cannot be refreshed
    if (!record.refreshTokenEncrypted) {
      await this._cleanupExpiredConnection(userId);
      throw new AppError(
        "GitHub authorization has expired. Please reconnect your GitHub account.",
        401
      );
    }

    // Decrypt the stored refresh token
    let plainRefreshToken;
    try {
      plainRefreshToken = decrypt(record.refreshTokenEncrypted);
    } catch {
      await this._cleanupExpiredConnection(userId);
      throw new AppError(
        "Stored GitHub refresh token is invalid or corrupt. Please reconnect your GitHub account.",
        401
      );
    }

    if (!config.githubClientId || !config.githubClientSecret) {
      throw new AppError(
        "GitHub OAuth is not configured on the server. Missing client credentials.",
        500
      );
    }

    // Call GitHub token refresh endpoint
    let tokenData;
    try {
      const response = await fetch(GITHUB_TOKEN_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": "DEVAI-Backend",
        },
        body: JSON.stringify({
          client_id: config.githubClientId,
          client_secret: config.githubClientSecret,
          grant_type: "refresh_token",
          refresh_token: plainRefreshToken,
        }),
      });

      if (!response.ok) {
        // Refresh token rejected by GitHub (HTTP error)
        await this._cleanupExpiredConnection(userId);
        throw new AppError(
          "GitHub authorization has expired or been revoked. Please reconnect your GitHub account.",
          401
        );
      }

      tokenData = await response.json();
    } catch (err) {
      if (err instanceof AppError) throw err;
      // Network/communication failure
      throw new AppError("Failed to communicate with GitHub OAuth server for token refresh", 502);
    }

    // Check for OAuth error in payload (e.g. bad_refresh_token)
    if (tokenData.error) {
      await this._cleanupExpiredConnection(userId);
      throw new AppError(
        "GitHub authorization has expired or been revoked. Please reconnect your GitHub account.",
        401
      );
    }

    const newAccessToken = tokenData.access_token;
    if (!newAccessToken) {
      await this._cleanupExpiredConnection(userId);
      throw new AppError(
        "GitHub token refresh did not return a valid access token. Please reconnect your GitHub account.",
        401
      );
    }

    // Encrypt new tokens
    let newAccessTokenEncrypted;
    try {
      newAccessTokenEncrypted = encrypt(newAccessToken);
    } catch (err) {
      throw new AppError(
        `Failed to encrypt refreshed GitHub access token: ${err.message}`,
        500
      );
    }

    // Token rotation: GitHub may issue a new refresh token
    let newRefreshTokenEncrypted = record.refreshTokenEncrypted;
    if (tokenData.refresh_token) {
      try {
        newRefreshTokenEncrypted = encrypt(tokenData.refresh_token);
      } catch (err) {
        throw new AppError(
          `Failed to encrypt refreshed GitHub refresh token: ${err.message}`,
          500
        );
      }
    }

    // Calculate new expiration dates
    let newAccessTokenExpiresAt = null;
    if (tokenData.expires_in && typeof tokenData.expires_in === "number") {
      newAccessTokenExpiresAt = new Date(
        Date.now() + tokenData.expires_in * 1000
      );
    }

    let newRefreshTokenExpiresAt = record.refreshTokenExpiresAt;
    if (
      tokenData.refresh_token_expires_in &&
      typeof tokenData.refresh_token_expires_in === "number"
    ) {
      newRefreshTokenExpiresAt = new Date(
        Date.now() + tokenData.refresh_token_expires_in * 1000
      );
    }

    const newScopes = tokenData.scope || record.scopes;

    // Persist updated credentials in database
    await githubConnectionRepository.updateTokens(userId, {
      accessTokenEncrypted: newAccessTokenEncrypted,
      refreshTokenEncrypted: newRefreshTokenEncrypted,
      accessTokenExpiresAt: newAccessTokenExpiresAt,
      refreshTokenExpiresAt: newRefreshTokenExpiresAt,
      scopes: newScopes,
    });

    return newAccessToken;
  }

  /**
   * Cleans up an unusable connection record when refresh fails.
   *
   * @private
   * @param {string} userId
   */
  async _cleanupExpiredConnection(userId) {
    try {
      await githubConnectionRepository.deleteByUserId(userId);
    } catch (err) {
      console.error(
        `[GithubTokenService] Failed to clean up invalid connection for user ${userId}:`,
        err.message
      );
    }
  }
}

export default new GithubTokenService();
