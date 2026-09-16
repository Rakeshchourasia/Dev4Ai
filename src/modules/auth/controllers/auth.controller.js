import authService from "../services/auth.service.js";
import githubAuthService from "../services/githubAuth.service.js";
import config from "../../../config/index.js";

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
    const isHtml =
      req.headers.accept?.includes("text/html") ||
      req.headers["sec-fetch-dest"] === "document" ||
      req.query.format === "html";

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

      if (isHtml) {
        res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        const frontendUrl = config.frontendUrl || "http://localhost:5173";
        return res.status(200).send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Authentication Successful</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: #090d16;
      color: #f8fafc;
      text-align: center;
    }
    .card {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 12px;
      padding: 32px 24px;
      max-width: 360px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }
    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid rgba(99, 102, 241, 0.2);
      border-left-color: #6366f1;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px auto;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h3 style="margin: 0 0 8px 0; font-size: 18px;">Authentication Successful</h3>
    <p style="margin: 0; color: #94a3b8; font-size: 14px;">Returning to DEVAI...</p>
  </div>
  <script>
    (function() {
      const authData = ${JSON.stringify({
        type: "DEVAI_AUTH_SUCCESS",
        data: result,
      })};

      if (window.opener) {
        window.opener.postMessage(authData, "*");
        setTimeout(function() { window.close(); }, 500);
      } else {
        const frontendUrl = ${JSON.stringify(frontendUrl)};
        const params = new URLSearchParams({
          oauth: "success",
          user: JSON.stringify(result.user),
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        });
        window.location.href = frontendUrl + "/auth?" + params.toString();
      }
    })();
  </script>
</body>
</html>`);
      }

      return res.status(200).json({
        success: true,
        message: "GitHub authentication successful",
        data: result,
      });
    } catch (error) {
      if (isHtml) {
        res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.status(error.statusCode || 400).send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Authentication Failed</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: #090d16;
      color: #f8fafc;
      text-align: center;
      padding: 20px;
    }
    .card {
      background: #111827;
      border: 1px solid #ef4444;
      border-radius: 12px;
      padding: 32px 24px;
      max-width: 400px;
    }
    button {
      background: #ef4444;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      margin-top: 16px;
    }
  </style>
</head>
<body>
  <div class="card">
    <h3 style="margin: 0 0 8px 0; color: #ef4444;">Authentication Failed</h3>
    <p style="margin: 0; color: #94a3b8; font-size: 14px;">${error.message || "An error occurred during authentication."}</p>
    <button onclick="window.close()">Close Window</button>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({
        type: "DEVAI_AUTH_ERROR",
        message: ${JSON.stringify(error.message || "Authentication failed")},
      }, "*");
      setTimeout(function() { window.close(); }, 3000);
    }
  </script>
</body>
</html>`);
      }

      next(error);
    }
  }
}

export default new AuthController();