import { Router } from "express";
import { validate } from "../../../shared/middlewares/validate.js";
import { loginSchema } from "../../../validation/login.schema.js";
import { refreshSchema } from "../../../validation/refresh.schema.js";
import authController from "../controllers/auth.controller.js";
import authenticate from "../../../shared/middlewares/auth.middleware.js";
import { registerSchema } from "../../../validation/register.schema.js";
import authRateLimiter from "../../../shared/middlewares/authRateLimiter.js";

const router = Router();
router.post("/login", authRateLimiter, validate(loginSchema), authController.login);
router.get("/me", authenticate, authController.me);
router.post("/refresh", authRateLimiter, validate(refreshSchema), authController.refresh);
router.post("/logout", authRateLimiter, validate(refreshSchema), authController.logout);
router.post("/register", authRateLimiter, validate(registerSchema), authController.register);
export default router;