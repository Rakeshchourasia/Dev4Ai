import { verifyAccessToken } from "../utils/jwt.js";
import AppError from "../errors/AppError.js";

export default function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(
      new AppError("Authorization header missing", 401)
    );
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return next(
      new AppError("Token missing", 401)
    );
  }

  try {
    const payload = verifyAccessToken(token);

    req.user = payload;

    next();
  } catch (error) {
    console.error("JWT verification error:", error);

    next(
      new AppError("Invalid or expired token", 401)
    );
  }
}