import authService from "../services/auth.service.js";
import githubAuthService from "../services/githubAuth.service.js";
import config from "../../../config/index.js";
import crypto from "crypto";

const exchangeStore = new Map();

class AuthController {
  async login(req, res, next) {
    try {
      const result = await authService.login(req.body);

      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async me(req, res, next) {
    try {
      const user = await authService.getCurrentUser(req.user.id);

      return res.status(200).json({
        success: true,
        message: "User fetched successfully",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;

      const result = await authService.refresh(refreshToken);

      return res.status(200).json({
        success: true,
        message: "Access token refreshed",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;

      await authService.logout(refreshToken);

      return res.status(200).json({
        success: true,
        message: "Logout successful",
      });
    } catch (error) {
      next(error);
    }
  }

  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);

      return res.status(201).json({
        success: true,
        message: "Registration successful",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // GITHUB OAUTH - INITIATE
  // ==========================================

  async githubLogin(req, res, next) {
    try {
      const { authUrl, stateToken, nonce } =
        githubAuthService.generateAuthorizationUrl();

      const isProduction = process.env.NODE_ENV === "production";

      res.setHeader(
        "Set-Cookie",
        `devai_oauth_nonce=${nonce}; Path=/auth/github; HttpOnly; SameSite=Lax; Max-Age=600${
          isProduction ? "; Secure" : ""
        }`
      );

      if (req.headers.accept?.includes("application/json")) {
        return res.status(200).json({
          success: true,
          message: "GitHub authorization URL generated",
          data: {
            authUrl,
            state: stateToken,
          },
        });
      }

      return res.redirect(302, authUrl);
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // GITHUB OAUTH - CALLBACK
  // ==========================================

  async githubCallback(req, res, next) {
    const frontendUrl = config.frontendUrl || "http://localhost:5173";

    try {
      const { code, state, error, error_description } = req.query;

      let cookieNonce = null;
      const cookieHeader = req.headers.cookie;
      if (cookieHeader) {
        const match = cookieHeader.match(/devai_oauth_nonce=([^;]+)/);
        if (match) {
          cookieNonce = match[1];
        }
      }

      const result = await githubAuthService.handleCallback({
        code,
        state,
        error,
        errorDescription: error_description,
        cookieNonce,
      });

      const isProduction = process.env.NODE_ENV === "production";
      res.setHeader(
        "Set-Cookie",
        `devai_oauth_nonce=; Path=/auth/github; HttpOnly; SameSite=Lax; Max-Age=0${
          isProduction ? "; Secure" : ""
        }`
      );

      const isHtml =
        req.headers.accept?.includes("text/html") ||
        req.headers["sec-fetch-dest"] === "document" ||
        req.query.format === "html";

      if (!isHtml) {
        return res.status(200).json({
          success: true,
          message: "GitHub authentication successful",
          data: result,
        });
      }

      // For browser requests (popup or direct):
      // Redirect to the frontend with tokens as URL params.
      // The frontend handles session setup and popup closing from its own origin,
      // avoiding cross-origin postMessage issues caused by GitHub's COOP headers.
      // Store result securely in memory for 5 minutes
      const exchangeCode = crypto.randomBytes(32).toString("hex");
      exchangeStore.set(exchangeCode, result);
      setTimeout(() => exchangeStore.delete(exchangeCode), 5 * 60 * 1000);

      const params = new URLSearchParams({
        oauth: "success",
        code: exchangeCode,
      });

      return res.redirect(302, `${frontendUrl}/login?${params.toString()}`);
    } catch (error) {
      // For browser error cases, redirect to frontend with error param
      const isHtml =
        req.headers.accept?.includes("text/html") ||
        req.headers["sec-fetch-dest"] === "document" ||
        req.query.format === "html";

      if (isHtml) {
        const params = new URLSearchParams({
          oauth: "error",
          message: error.message || "GitHub authentication failed",
        });
        return res.redirect(302, `${frontendUrl}/login?${params.toString()}`);
      }

      next(error);
    }
  }

  // ==========================================
  // GITHUB OAUTH - EXCHANGE
  // ==========================================

  async githubExchange(req, res, next) {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ success: false, message: "Exchange code missing" });
      }

      const result = exchangeStore.get(code);
      if (!result) {
        return res.status(400).json({ success: false, message: "Invalid or expired exchange code" });
      }

      // One-time use
      exchangeStore.delete(code);

      return res.status(200).json({
        success: true,
        message: "Exchange successful",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();