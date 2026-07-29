import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { PaginatedResult } from '@/lib/pagination';

type PaginationBarProps = {
  result: PaginatedResult<unknown>;
  hrefForPage: (page: number) => string;
  className?: string;
};

export function PaginationBar({ result, hrefForPage, className }: PaginationBarProps) {
  const { page, totalPages, total, pageSize, rows } = result;
  if (total === 0) return null;

  const from = (page - 1) * pageSize + (rows.length > 0 ? 1 : 0);
  const to = (page - 1) * pageSize + rows.length;
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted',
        className,
      )}
    >
      <p>
        Showing <span className="font-medium text-foreground">{from}</span>–
        <span className="font-medium text-foreground">{to}</span> of{' '}
        <span className="font-medium text-foreground">{total.toLocaleString()}</span>
      </p>
      <div className="flex items-center gap-2">
        {hasPrev ? (
          <Link
            href={hrefForPage(page - 1)}
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-foreground hover:bg-surface-muted"
          >
            Previous
          </Link>
        ) : (
          <span className="rounded-md border border-border px-3 py-1.5 opacity-40">Previous</span>
        )}
        <span className="min-w-[5.5rem] text-center text-foreground">
          Page {page} of {totalPages.toLocaleString()}
        </span>
        {hasNext ? (
          <Link
            href={hrefForPage(page + 1)}
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-foreground hover:bg-surface-muted"
          >
            Next
          </Link>
        ) : (
          <span className="rounded-md border border-border px-3 py-1.5 opacity-40">Next</span>
        )}
      </div>
    </div>
  );
}
