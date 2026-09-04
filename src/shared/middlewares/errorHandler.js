import AppError from "../errors/AppError.js";

export default function errorHandler(
  err,
  req,
  res,
  next
) {
  console.error(err);

  const statusCode =
    err.statusCode || 500;

  return res
    .status(statusCode)
    .json({
      success: false,
      message:
        err.message ||
        "Internal server error",
    });
}