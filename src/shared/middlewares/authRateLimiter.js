import rateLimit from "express-rate-limit";

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: (req) =>
    process.env.NODE_ENV === "test"
      ? req.headers["x-test-rate-limit"]
        ? 2
        : 1000
      : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later.",
  },
});

export default authRateLimiter;