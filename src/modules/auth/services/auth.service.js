
import authRepository from "../repositories/auth.repository.js";
import AppError from "../../../shared/errors/AppError.js";

import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../../../shared/utils/jwt.js";

import {
  comparePassword,
  hashPassword,
} from "../../../shared/utils/password.js";

class AuthService {
  // ==========================================
  // LOGIN
  // ==========================================

  async login(userData) {
    // 1. Validate input
    if (
      !userData?.email ||
      !userData?.password
    ) {
      throw new AppError(
        "Email and password are required",
        400
      );
    }

    // 2. Find existing user
    const user =
      await authRepository.findByEmail(
        userData.email
      );

    // 3. User must already exist
    if (!user) {
      throw new AppError(
        "Invalid email or password",
        401
      );
    }

    // 4. Compare password
    const passwordValid =
      await comparePassword(
        userData.password,
        user.password
      );

    if (!passwordValid) {
      throw new AppError(
        "Invalid email or password",
        401
      );
    }

    // 5. Generate Access Token
    const accessToken =
      generateAccessToken({
        id: user.id,
        email: user.email,
        role: user.role,
      });

    // 6. Generate Refresh Token
    const refreshToken =
      generateRefreshToken({
        id: user.id,
        email: user.email,
        role: user.role,
      });

    // 7. Store Refresh Token
    await authRepository.createRefreshToken({
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(
        Date.now() +
          7 * 24 * 60 * 60 * 1000
      ),
    });

    // 8. Never return password
    const {
      password,
      ...safeUser
    } = user;

    return {
      user: safeUser,
      accessToken,
      refreshToken,
    };
  }

  // ==========================================
  // GET CURRENT USER
  // ==========================================

  async getCurrentUser(userId) {
    const user =
      await authRepository.findById(
        userId
      );

    if (!user) {
      throw new AppError(
        "User not found",
        404
      );
    }

    // Never return password
    const {
      password,
      ...safeUser
    } = user;

    return safeUser;
  }

  // ==========================================
  // REFRESH ACCESS TOKEN
  // ==========================================

  async refresh(refreshToken) {
    if (!refreshToken) {
      throw new AppError(
        "Refresh token is required",
        400
      );
    }

    let payload;

    // 1. Verify refresh token
    try {
      payload =
        verifyRefreshToken(
          refreshToken
        );
    } catch (error) {
      throw new AppError(
        "Invalid or expired refresh token",
        401
      );
    }

    // 2. Check token exists in database
    const savedToken =
      await authRepository.findRefreshToken(
        refreshToken
      );

    if (!savedToken) {
      throw new AppError(
        "Invalid refresh token",
        401
      );
    }

    // 3. Generate new Access Token
    const accessToken =
      generateAccessToken({
        id: payload.id,
        email: payload.email,
        role: payload.role,
      });

    return {
      accessToken,
    };
  }

  // ==========================================
  // LOGOUT
  // ==========================================

  async logout(refreshToken) {
    if (!refreshToken) {
      throw new AppError(
        "Refresh token is required",
        400
      );
    }

    // Revoke refresh token
    await authRepository.deleteRefreshToken(
      refreshToken
    );

    return {
      message: "Logged out successfully",
    };
  }

  // ==========================================
  // REGISTER
  // ==========================================

  async register(userData) {
    // 1. Check whether email already exists
    const existingUser =
      await authRepository.findByEmail(
        userData.email
      );

    if (existingUser) {
      throw new AppError(
        "Email already registered",
        409
      );
    }

    // 2. Hash password
    const hashedPassword =
      await hashPassword(
        userData.password
      );

    // 3. Create user
    // IMPORTANT:
    // Do not accept role from registration.
    // Database defaults new users to MEMBER.
    const user =
      await authRepository.createUser({
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
      });

    // 4. Never return password
    const {
      password,
      ...safeUser
    } = user;

    return safeUser;
  }
}

export default new AuthService();
