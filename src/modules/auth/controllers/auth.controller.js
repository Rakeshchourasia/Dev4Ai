import authService from "../services/auth.service.js";
import githubAuthService from "../services/githubAuth.service.js";

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

      return res.status(200).json({
        success: true,
        message: "GitHub authentication successful",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();