import AppError from "../errors/AppError.js";

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new AppError(
          "Authentication required",
          401
        )
      );
    }

    if (!req.user.role) {
      return next(
        new AppError(
          "User role not found",
          403
        )
      );
    }

    if (
      !allowedRoles.includes(req.user.role)
    ) {
      return next(
        new AppError(
          "You are not authorized to perform this action",
          403
        )
      );
    }

    next();
  };
};

export default authorize;