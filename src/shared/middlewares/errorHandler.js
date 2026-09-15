import AppError from "../errors/AppError.js";

export default function errorHandler(err, req, res, next) {
  // Always log the full error server-side (stack included)
  console.error("[ErrorHandler]", err);

  // ==========================================
  // DETERMINE STATUS CODE
  // ==========================================

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";
  let errors = err.errors || null;

  // ==========================================
  // HANDLE ZOD ERRORS
  // Zod errors may bubble up if not caught by validate middleware
  // ==========================================

  if (err.name === "ZodError" && err.issues) {
    statusCode = 400;
    message = "Validation failed";
    errors = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
  }

  // ==========================================
  // HANDLE POSTGRESQL / DATABASE ERRORS
  // ==========================================

  const pgCode = err.code || err.cause?.code;
  const pgDetail = err.detail || err.cause?.detail;

  if (pgCode === "23505") {
    statusCode = 409;
    message = "Resource already exists";
    if (pgDetail) {
      errors = [{ field: "database", message: pgDetail }];
    }
  } else if (pgCode === "23503") {
    statusCode = 400;
    message = "Referenced resource does not exist";
    if (pgDetail) {
      errors = [{ field: "database", message: pgDetail }];
    }
  } else if (pgCode === "22P02") {
    statusCode = 400;
    message = "Invalid identifier format";
  }

  // ==========================================
  // SCRUB INTERNAL ERRORS IN PRODUCTION
  // Never expose raw DB/server errors to clients
  // ==========================================

  const isProduction = process.env.NODE_ENV === "production";

  if (statusCode === 500 && isProduction) {
    message = "Internal server error";
    errors = null;
  }

  // ==========================================
  // RESPONSE
  // ==========================================

  const body = {
    success: false,
    message,
  };

  // Only include errors array when it has content
  if (errors && errors.length > 0) {
    body.errors = errors;
  }

  return res.status(statusCode).json(body);
}