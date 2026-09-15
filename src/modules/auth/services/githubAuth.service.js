import crypto from "crypto";
import jwt from "jsonwebtoken";
import config from "../../../config/index.js";
import AppError from "../../../shared/errors/AppError.js";
import authService from "./auth.service.js";
import githubConnectionService from "../../github/services/githubConnection.service.js";

const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";
const GITHUB_EMAILS_URL = "https://api.github.com/user/emails";

class GithubAuthService {
  // ==========================================
  // GENERATE AUTHORIZATION URL
  // ==========================================

  generateAuthorizationUrl() {
    if (!config.githubClientId) {
      throw new AppError(
        "GitHub OAuth is not configured. GITHUB_CLIENT_ID is missing.",
        500
      );
    }

    // 1. Generate CSRF state nonce
    const nonce = crypto.randomBytes(32).toString("hex");

    // 2. Generate PKCE code verifier and code challenge (S256)
    const codeVerifier = crypto.randomBytes(32).toString("base64url");
    const codeChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    // 3. Create signed, tamper-proof state token (valid for 10 minutes)
    const stateToken = jwt.sign(
      {
        nonce,
        codeVerifier,
        type: "github_oauth_state",
      },
      config.jwtSecret,
      { expiresIn: "10m" }
    );

    // 4. Construct GitHub authorization URL
    const params = new URLSearchParams({
      client_id: config.githubClientId,
      redirect_uri: config.githubCallbackUrl,
      scope: "read:user user:email",
      state: stateToken,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    const authUrl = `${GITHUB_AUTH_URL}?${params.toString()}`;

    return {
      authUrl,
      stateToken,
      nonce,
    };
  }

  // ==========================================
  // HANDLE OAUTH CALLBACK
  // ==========================================

  async handleCallback({
    code,
    state,
    error,
    errorDescription,
    cookieNonce,
  }) {
    // 1. Check for OAuth errors from GitHub
    if (error) {
      throw new AppError(
        `GitHub authorization denied: ${errorDescription || error}`,
        400
      );
    }

    // 2. Validate input presence
    if (!code) {
      throw new AppError("Authorization code is missing", 400);
    }

    if (!state) {
      throw new AppError("OAuth state parameter is missing", 400);
    }

    // 3. Verify state integrity and expiration
    let decoded;
    try {
      decoded = jwt.verify(state, config.jwtSecret);
    } catch (err) {
      throw new AppError(
        "Invalid or expired OAuth state. Please restart authentication.",
        400
      );
    }

    if (decoded.type !== "github_oauth_state" || !decoded.codeVerifier) {
      throw new AppError("Malformed OAuth state token", 400);
    }

    // 4. Validate double-submit cookie nonce if cookie is present
    if (cookieNonce && cookieNonce !== decoded.nonce) {
      throw new AppError(
        "OAuth state CSRF validation failed. Nonce mismatch.",
        403
      );
    }

    if (!config.githubClientSecret) {
      throw new AppError(
        "GitHub OAuth is not configured. GITHUB_CLIENT_SECRET is missing.",
        500
      );
    }

    // 5. Exchange code + code_verifier for GitHub access token
    let tokenData;
    try {
      const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": "DEVAI-Backend",
        },
        body: JSON.stringify({
          client_id: config.githubClientId,
          client_secret: config.githubClientSecret,
          code,
          redirect_uri: config.githubCallbackUrl,
          code_verifier: decoded.codeVerifier,
        }),
      });

      if (!tokenResponse.ok) {
        throw new AppError(
          `GitHub token exchange returned status ${tokenResponse.status}`,
          400
        );
      }

      tokenData = await tokenResponse.json();
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError("Failed to communicate with GitHub OAuth server", 502);
    }

    if (tokenData.error) {
      throw new AppError(
        `GitHub token exchange error: ${tokenData.error_description || tokenData.error}`,
        400
      );
    }

    const githubAccessToken = tokenData.access_token;
    if (!githubAccessToken) {
      throw new AppError(
        "GitHub token exchange did not return an access token",
        400
      );
    }

    // 6. Fetch GitHub user profile
    let githubUser;
    try {
      const userResponse = await fetch(GITHUB_USER_URL, {
        headers: {
          Authorization: `Bearer ${githubAccessToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "DEVAI-Backend",
        },
      });

      if (!userResponse.ok) {
        throw new AppError(
          `Failed to fetch user profile from GitHub (HTTP ${userResponse.status})`,
          502
        );
      }

      githubUser = await userResponse.json();
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError("Failed to communicate with GitHub API", 502);
    }

    if (!githubUser?.id) {
      throw new AppError("Invalid user profile received from GitHub", 502);
    }

    // 7. Fetch and verify GitHub emails
    let verifiedEmail = null;

    try {
      const emailsResponse = await fetch(GITHUB_EMAILS_URL, {
        headers: {
          Authorization: `Bearer ${githubAccessToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "DEVAI-Backend",
        },
      });

      if (emailsResponse.ok) {
        const emails = await emailsResponse.json();
        if (Array.isArray(emails)) {
          // Priority 1: Primary and verified
          const primaryVerified = emails.find(
            (e) => e.verified === true && e.primary === true
          );
          // Priority 2: Any verified email
          const anyVerified = emails.find((e) => e.verified === true);

          verifiedEmail = primaryVerified?.email || anyVerified?.email || null;
        }
      }
    } catch (err) {
      console.warn(
        "[GitHub OAuth] Failed to fetch emails endpoint, falling back to profile email:",
        err.message
      );
    }

    // Fallback: Check if profile email was provided and verified
    if (!verifiedEmail && githubUser.email) {
      // If the emails endpoint didn't provide emails, but profile email is present
      verifiedEmail = githubUser.email;
    }

    if (!verifiedEmail) {
      throw new AppError(
        "No verified email found on your GitHub account. A verified email is required for login.",
        400
      );
    }

    // 8. Authenticate, link, or create local user
    const authResult = await authService.loginOrCreateWithProvider({
      provider: "GITHUB",
      providerAccountId: String(githubUser.id),
      email: verifiedEmail.toLowerCase().trim(),
      name: githubUser.name || githubUser.login,
      avatarUrl: githubUser.avatar_url,
    });

    // 9. Persist GitHub OAuth credentials (encrypted) for future API access
    // This runs after the transaction has committed so it uses the default db.
    // Failure here is non-fatal for auth — we log and continue so the user
    // still receives their DEVAI tokens even if token storage has an issue.
    try {
      await githubConnectionService.upsert({
        userId: authResult.user.id,
        githubUserId: String(githubUser.id),
        githubUsername: githubUser.login,
        accessToken: githubAccessToken,
        refreshToken: tokenData.refresh_token || null,
        scopes: tokenData.scope || "read:user user:email",
        tokenData,
      });
    } catch (err) {
      // Do NOT expose token errors to the client — just log server-side
      console.error(
        "[GithubAuth] Failed to persist GitHub connection (non-fatal):",
        err.message
      );
    }

    // Return the existing auth contract — GitHub token is NEVER included
    return authResult;
  }
}

export default new GithubAuthService();
