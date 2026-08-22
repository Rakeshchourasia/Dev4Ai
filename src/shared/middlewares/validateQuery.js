export const validateQuery = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const errors = result.error.issues.map(
        (error) => error.message
      );

      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors,
      });
    }

    req.query = result.data;

    next();
  };
};