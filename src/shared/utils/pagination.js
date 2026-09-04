export const getPagination = (query = {}) => {
  const page = Math.max(
    Number(query.page) || 1,
    1
  );

  const limit = Math.min(
    Math.max(
      Number(query.limit) || 10,
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
  const totalPages =
    total === 0
      ? 0
      : Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,

    hasNextPage:
      page < totalPages,

    hasPreviousPage:
      page > 1 && totalPages > 0,
  };
};