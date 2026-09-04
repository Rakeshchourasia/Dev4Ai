export const successResponse = ({
  res,
  statusCode = 200,
  message = "Success",
  data = null,
  pagination,
}) => {
  const response = {
    success: true,
    message,
    data,
  };

  if (pagination) {
    response.pagination = pagination;
  }

  return res
    .status(statusCode)
    .json(response);
};

export const errorResponse = ({
  res,
  statusCode = 500,
  message = "Internal server error",
  errors,
}) => {
  const response = {
    success: false,
    message,
  };

  if (errors) {
    response.errors = errors;
  }

  return res
    .status(statusCode)
    .json(response);
};