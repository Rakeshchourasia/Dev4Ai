export const getPagination = (query = {}) => {
  const page = Math.max(
    Number(query.page) || 1,
    1
  );

  const rawLimit = query.limit ?? query.perPage;
  const limit = Math.min(
    Math.max(
      Number(rawLimit) || 10,
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
    perPage: limit,
    total,
    totalPages,

    hasNextPage:
      page < totalPages,

    hasPreviousPage:
      page > 1 && totalPages > 0,
  };
};