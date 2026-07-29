export const DEFAULT_PAGE_SIZE = 50;

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

/** Build a path with `page` query (omits page=1). Preserves other params. */
export function hrefWithPage(pathname: string, page: number, extras?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (extras) {
    for (const [key, value] of Object.entries(extras)) {
      if (value != null && value !== '') params.set(key, value);
    }
  }
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
