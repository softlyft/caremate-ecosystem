import { PageHeader } from '@/components/page-header';
import { PaginationBar } from '@/components/pagination-bar';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { canEditCatalog } from '@/constants/roles';
import { isCurrentsConfigured } from '@/domains/news/currents';
import { listExternalNewsPage } from '@/domains/news/repository';
import { ExternalNewsManager } from '@/features/news/external-news-manager';
import { getPortalSession } from '@/lib/auth';
import type { Article } from '@/types/database';
import { emptyPage, parsePage, type PaginatedResult } from '@/lib/pagination';

function newsHref(opts: {
  q?: string;
  region?: string;
  status?: string;
  page?: number;
}): string {
  const params = new URLSearchParams();
  if (opts.q?.trim()) params.set('q', opts.q.trim());
  if (opts.region) params.set('region', opts.region);
  if (opts.status && opts.status !== 'all') params.set('status', opts.status);
  if (opts.page && opts.page > 1) params.set('page', String(opts.page));
  const qs = params.toString();
  return `/dashboard/news${qs ? `?${qs}` : ''}`;
}

export default async function ExternalNewsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; region?: string; status?: string; page?: string }>;
}) {
  const session = await getPortalSession();
  const canEdit = canEditCatalog(session?.role);
  const { q, region, status, page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  const statusFilter =
    status === 'published' || status === 'unpublished' || status === 'all' ? status : 'all';

  let articles: PaginatedResult<Article> = emptyPage(page);
  try {
    articles = await listExternalNewsPage({
      search: q,
      region: region || undefined,
      status: statusFilter,
      page,
    });
  } catch {
    articles = emptyPage(page);
  }

  const hrefForPage = (nextPage: number) =>
    newsHref({ q, region, status: statusFilter, page: nextPage });

  return (
    <div>
      <PageHeader
        title="External news"
        description="Currents health news synced manually for INT and NG. Published rows sync to devices; mobile keeps only the last 7 calendar days."
      />

      <form className="mb-4 flex flex-wrap gap-2">
        <Input name="q" defaultValue={q} placeholder="Search title…" className="max-w-xs" />
        <Select name="region" defaultValue={region ?? ''} className="w-36">
          <option value="">All regions</option>
          <option value="INT">INT</option>
          <option value="NG">NG</option>
        </Select>
        <Select name="status" defaultValue={statusFilter} className="w-40">
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="unpublished">Unpublished</option>
        </Select>
        <button type="submit" className="h-10 rounded-md bg-primary px-4 text-sm text-white">
          Filter
        </button>
      </form>

      <ExternalNewsManager
        articles={articles.rows}
        canEdit={Boolean(canEdit)}
        currentsConfigured={isCurrentsConfigured()}
      />
      <PaginationBar result={articles} hrefForPage={hrefForPage} className="mt-0 rounded-b-lg border border-t-0 border-border bg-white" />
    </div>
  );
}
