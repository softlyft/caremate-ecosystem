import { listTips } from '@/domains/tips/repository';
import { getPortalSession } from '@/lib/auth';
import { canEditCatalog } from '@/constants/roles';
import { HEALTH_CATEGORIES } from '@/constants/categories';
import { PageHeader } from '@/components/page-header';
import { TipsManager } from '@/features/tips/tips-manager';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export default async function TipsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const session = await getPortalSession();
  const canEdit = canEditCatalog(session?.role);
  const { q, category } = await searchParams;

  let tips: Awaited<ReturnType<typeof listTips>> = [];
  try {
    tips = await listTips({ search: q, categoryId: category || undefined });
  } catch {
    tips = [];
  }

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

      <TipsManager tips={tips} canEdit={Boolean(canEdit)} />
    </div>
  );
}
