
import authRepository from "../repositories/auth.repository.js";
import userAuthAccountRepository from "../repositories/userAuthAccount.repository.js";
import activityService from "../../activity/services/activity.service.js";
import { db } from "../../../db/index.js";
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
    if (!user.password) {
      throw new AppError(
        "Password login is not enabled for this account. Please log in with GitHub.",
        400
      );
    }

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

  // ==========================================
  // LOGIN OR CREATE WITH OAUTH PROVIDER
  // ==========================================

  async loginOrCreateWithProvider({
    provider,
    providerAccountId,
    email,
    name,
    avatarUrl,
  }) {
    if (!provider || !providerAccountId || !email) {
      throw new AppError("Provider, account ID, and email are required", 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Transactionally find/link/create user
    const resolvedUser = await db.transaction(async (tx) => {
      // Step A: Check if provider account already exists
      const existingAccount =
        await userAuthAccountRepository.findByProviderAccount(
          provider,
          providerAccountId,
          tx
        );

      if (existingAccount) {
        const user = await authRepository.findById(existingAccount.userId, tx);
        if (!user) {
          throw new AppError("Linked user account not found", 404);
        }

        await activityService.log(
          {
            userId: user.id,
            action: "GITHUB_LOGIN",
            entityType: "USER",
            entityId: user.id,
            description: `User "${user.email}" logged in via ${provider}`,
          },
          tx
        );

        return user;
      }

      // Step B: Check if a local user exists with the verified provider email
      const existingUserByEmail = await authRepository.findByEmail(
        normalizedEmail,
        tx
      );

      if (existingUserByEmail) {
        // Link existing user to this provider
        await userAuthAccountRepository.create(
          {
            userId: existingUserByEmail.id,
            provider,
            providerAccountId,
            providerEmail: normalizedEmail,
          },
          tx
        );

        await activityService.log(
          {
            userId: existingUserByEmail.id,
            action: "GITHUB_ACCOUNT_LINKED",
            entityType: "USER",
            entityId: existingUserByEmail.id,
            description: `Linked ${provider} account (${providerAccountId}) to user "${existingUserByEmail.email}"`,
          },
          tx
        );

        return existingUserByEmail;
      }

      // Step C: Create new user (Role is ALWAYS MEMBER, password is null)
      const newUser = await authRepository.createUser(
        {
          name: name?.trim() || normalizedEmail.split("@")[0],
          email: normalizedEmail,
          password: null,
          role: "MEMBER",
        },
        tx
      );

      await userAuthAccountRepository.create(
        {
          userId: newUser.id,
          provider,
          providerAccountId,
          providerEmail: normalizedEmail,
        },
        tx
      );

      await activityService.log(
        {
          userId: newUser.id,
          action: "GITHUB_LOGIN",
          entityType: "USER",
          entityId: newUser.id,
          description: `Created new user "${newUser.email}" and logged in via ${provider}`,
        },
        tx
      );

      return newUser;
    });

    // 2. Generate standard DEVAI access and refresh tokens
    const accessToken = generateAccessToken({
      id: resolvedUser.id,
      email: resolvedUser.email,
      role: resolvedUser.role,
    });

    const refreshToken = generateRefreshToken({
      id: resolvedUser.id,
      email: resolvedUser.email,
      role: resolvedUser.role,
    });

    // 3. Store refresh token in existing storage
    await authRepository.createRefreshToken({
      userId: resolvedUser.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const { password, ...safeUser } = resolvedUser;

    return {
      user: safeUser,
      accessToken,
      refreshToken,
    };
  }
}

export default new AuthService();
