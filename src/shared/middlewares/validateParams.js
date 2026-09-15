import AppError from "../errors/AppError.js";

export const validateParams = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join(".") || issue.path[0] || "params",
        message: issue.message,
      }));

      return next(
        new AppError("Validation failed", 400, errors)
      );
    }

    Object.assign(req.params, result.data);

    next();
  };
};

export default validateParams;
