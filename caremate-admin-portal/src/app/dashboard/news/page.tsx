import { PageHeader } from '@/components/page-header';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { canEditCatalog } from '@/constants/roles';
import { isCurrentsConfigured } from '@/domains/news/currents';
import { listExternalNews } from '@/domains/news/repository';
import { ExternalNewsManager } from '@/features/news/external-news-manager';
import { getPortalSession } from '@/lib/auth';

export default async function ExternalNewsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; region?: string; status?: string }>;
}) {
  const session = await getPortalSession();
  const canEdit = canEditCatalog(session?.role);
  const { q, region, status } = await searchParams;

  const statusFilter =
    status === 'published' || status === 'unpublished' || status === 'all' ? status : 'all';

  let articles: Awaited<ReturnType<typeof listExternalNews>> = [];
  try {
    articles = await listExternalNews({
      search: q,
      region: region || undefined,
      status: statusFilter,
    });
  } catch {
    articles = [];
  }

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
        articles={articles}
        canEdit={Boolean(canEdit)}
        currentsConfigured={isCurrentsConfigured()}
      />
    </div>
  );
}
