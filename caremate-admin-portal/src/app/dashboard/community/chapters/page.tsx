import { listChaptersPage, listCountries } from '@/domains/community/repository';
import { CreateChapterForm } from '@/features/community/create-chapter-form';
import { ChaptersTable } from '@/features/community/chapters-table';
import { emptyPage, parsePage, type PaginatedResult } from '@/lib/pagination';
import { PageHeader } from '@/components/page-header';
import { PaginationBar } from '@/components/pagination-bar';
import type { CommunityChapter } from '@/types/community';

function chaptersHref(page?: number): string {
  const params = new URLSearchParams();
  if (page && page > 1) params.set('page', String(page));
  const qs = params.toString();
  return `/dashboard/community/chapters${qs ? `?${qs}` : ''}`;
}

export default async function CommunityChaptersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  let chapters: PaginatedResult<CommunityChapter> = emptyPage(page);
  let countries: Awaited<ReturnType<typeof listCountries>> = [];
  try {
    [chapters, countries] = await Promise.all([listChaptersPage({ page }), listCountries()]);
  } catch {
    chapters = emptyPage(page);
    countries = [];
  }

  const hrefForPage = (nextPage: number) => chaptersHref(nextPage);

  return (
    <div>
      <PageHeader
        title="Chapters"
        description="Create and update chapters with country-specific cascading locations."
        actionHref="/dashboard/community/chapters/requests"
        actionLabel="Review requests"
      />

      <div className="mb-6 max-w-3xl">
        <CreateChapterForm countries={countries} />
      </div>

      <ChaptersTable chapters={chapters.rows} countries={countries} />
      <PaginationBar result={chapters} hrefForPage={hrefForPage} className="rounded-b-lg border border-t-0 border-border bg-white" />
    </div>
  );
}
