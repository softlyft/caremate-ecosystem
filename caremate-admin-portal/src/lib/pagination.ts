export const DEFAULT_PAGE_SIZE = 50;

export type ListPaging = {
  page?: number;
  pageSize?: number;
};

export type PaginatedResult<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function parsePage(raw: string | number | undefined | null): number {
  const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? '1'), 10);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export function pageRange(page: number, pageSize: number): { from: number; to: number } {
  const safePage = parsePage(page);
  const size = pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE;
  const from = (safePage - 1) * size;
  return { from, to: from + size - 1 };
}

export function paginatedResult<T>(
  rows: T[],
  total: number | null | undefined,
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  const size = pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE;
  const safeTotal = Math.max(0, total ?? rows.length);
  const totalPages = Math.max(1, Math.ceil(safeTotal / size) || 1);
  return {
    rows,
    total: safeTotal,
    page: parsePage(page),
    pageSize: size,
    totalPages,
  };
}

export function emptyPage<T>(page = 1, pageSize = DEFAULT_PAGE_SIZE): PaginatedResult<T> {
  return paginatedResult<T>([], 0, page, pageSize);
}
