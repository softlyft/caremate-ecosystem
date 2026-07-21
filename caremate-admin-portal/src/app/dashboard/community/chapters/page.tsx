import { listChapters, listCountries } from '@/domains/community/repository';
import { CreateChapterForm } from '@/features/community/create-chapter-form';
import { ChaptersTable } from '@/features/community/chapters-table';
import { PageHeader } from '@/components/page-header';

export default async function CommunityChaptersPage() {
  let chapters: Awaited<ReturnType<typeof listChapters>> = [];
  let countries: Awaited<ReturnType<typeof listCountries>> = [];
  try {
    [chapters, countries] = await Promise.all([listChapters(), listCountries()]);
  } catch {
    chapters = [];
    countries = [];
  }

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

      <ChaptersTable chapters={chapters} countries={countries} />
    </div>
  );
}
