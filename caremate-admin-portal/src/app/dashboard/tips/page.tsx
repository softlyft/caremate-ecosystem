import { listTipsPage } from '@/domains/tips/repository';
import { getPortalSession } from '@/lib/auth';
import { canEditCatalog } from '@/constants/roles';
import { HEALTH_CATEGORIES } from '@/constants/categories';
import { emptyPage, parsePage, type PaginatedResult } from '@/lib/pagination';
import { PageHeader } from '@/components/page-header';
import { PaginationBar } from '@/components/pagination-bar';
import { TipsManager } from '@/features/tips/tips-manager';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { HealthTip } from '@/types/database';

function tipsHref(opts: { q?: string; category?: string; page?: number }): string {
  const params = new URLSearchParams();
  if (opts.q?.trim()) params.set('q', opts.q.trim());
  if (opts.category) params.set('category', opts.category);
  if (opts.page && opts.page > 1) params.set('page', String(opts.page));
  const qs = params.toString();
  return `/dashboard/tips${qs ? `?${qs}` : ''}`;
}

export default async function TipsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const session = await getPortalSession();
  const canEdit = canEditCatalog(session?.role);
  const { q, category, page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  let tips: PaginatedResult<HealthTip> = emptyPage(page);
  try {
    tips = await listTipsPage({ search: q, categoryId: category || undefined, page });
  } catch {
    tips = emptyPage(page);
  }

  const hrefForPage = (nextPage: number) => tipsHref({ q, category, page: nextPage });

  return (
    <div>
      <PageHeader
        title="Health tips"
        description="Daily tips shown on the CareMate home screen (cloud catalog)."
      />

      <form className="mb-4 flex flex-wrap gap-2">
        <Input name="q" defaultValue={q} placeholder="Search tip text…" className="max-w-xs" />
        <Select name="category" defaultValue={category ?? ''} className="w-44">
          <option value="">All categories</option>
          {HEALTH_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <button type="submit" className="h-10 rounded-md bg-primary px-4 text-sm text-white">
          Filter
        </button>
      </form>

      <TipsManager tips={tips.rows} canEdit={Boolean(canEdit)} />
      <PaginationBar result={tips} hrefForPage={hrefForPage} className="mt-0 rounded-b-lg border border-t-0 border-border bg-white" />
    </div>
  );
}
