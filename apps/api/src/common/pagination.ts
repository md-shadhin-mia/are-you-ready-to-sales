export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

export interface PaginationInput {
  page?: number | string;
  limit?: number | string;
}

/** Normalizes paging input and enforces the platform-wide `take <= 100` bound. */
export function clampPagination(input: PaginationInput, defaultLimit = DEFAULT_PAGE_SIZE) {
  const rawPage = Math.floor(Number(input.page));
  const rawLimit = Math.floor(Number(input.limit));
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, MAX_PAGE_SIZE) : defaultLimit;
  return { page, limit, skip: (page - 1) * limit };
}

export function paginationMeta(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) || 1 };
}
