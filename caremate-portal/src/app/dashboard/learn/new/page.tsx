import { redirect } from 'next/navigation';
import { getPortalSession } from '@/lib/auth';
import { canEditCatalog } from '@/constants/roles';
import { PageHeader } from '@/components/page-header';
import { ArticleForm } from '@/features/articles/article-form';

export default async function NewArticlePage() {
  const session = await getPortalSession();
  if (!canEditCatalog(session?.role)) redirect('/dashboard/learn');

  return (
    <div>
      <PageHeader title="New learn item" description="Create catalog content for the mobile Learn tab." />
      <ArticleForm />
    </div>
  );
}
