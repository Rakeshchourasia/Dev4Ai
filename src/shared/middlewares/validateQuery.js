import AppError from "../errors/AppError.js";

export const validateQuery = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join(".") || issue.path[0] || "query",
        message: issue.message,
      }));

      return next(
        new AppError("Validation failed", 400, errors)
      );
    }

    // In Express 5, req.query is a getter. Clear and assign parsed values.
    for (const key of Object.keys(req.query)) {
      delete req.query[key];
    }
    Object.assign(req.query, result.data);

    next();
  };
};