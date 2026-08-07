import authRepository from "../repositories/auth.repository.js";
import AppError from "../../../shared/errors/AppError.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../../../shared/utils/jwt.js";

class AuthService {
  async login(userData) {
    // Validate input
    if (!userData.email || !userData.password) {
      throw new AppError("Email and password are required", 400);
    }

    // Check if user exists
    let user = await authRepository.findByEmail(userData.email);

    // Create user if not found
    if (!user) {
      user = await authRepository.create(userData);
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
    });

    const refreshToken = generateRefreshToken({
      id: user.id,
      email: user.email,
    });

    // Save refresh token in database
    await authRepository.createRefreshToken({
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  async getCurrentUser(userId) {
    const user = await authRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return user;
  }

  async refresh(refreshToken) {
    if (!refreshToken) {
      throw new AppError("Refresh token is required", 400);
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new AppError("Invalid refresh token", 401);
    }

    // Check if token exists in database
    const savedToken = await authRepository.findRefreshToken(refreshToken);

    if (!savedToken) {
      throw new AppError("Invalid refresh token", 401);
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      id: payload.id,
      email: payload.email,
    });

    return {
      accessToken,
    };
  }

  async logout(refreshToken) {
    if (!refreshToken) {
      throw new AppError("Refresh token is required", 400);
    }

    // Delete only this device's refresh token
    await authRepository.deleteRefreshToken(refreshToken);

    return {
      message: "Logged out successfully",
    };
  }
}

export default new AuthService();