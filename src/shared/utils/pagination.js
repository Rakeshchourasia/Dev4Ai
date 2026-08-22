export const getPagination = (query = {}) => {
  const page = Math.max(
    Number.parseInt(query.page, 10) || 1,
    1
  );

  const limit = Math.min(
    Math.max(
      Number.parseInt(query.limit, 10) || 10,
      1
    ),
    100
  );

  const offset = (page - 1) * limit;

  return {
    page,
    limit,
    offset,
  };
};

export const buildPagination = (
  page,
  limit,
  total
) => {
  return {
    page,
    limit,
    total,
    totalPages:
      total === 0
        ? 0
        : Math.ceil(total / limit),
  };
};

export const getPaginationMeta = (
  page,
  limit,
  total
) => {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
};