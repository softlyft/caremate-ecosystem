import { notFound, redirect } from 'next/navigation';
import { getArticle } from '@/domains/articles/repository';
import { getPortalSession } from '@/lib/auth';
import { canEditCatalog } from '@/constants/roles';
import { PageHeader } from '@/components/page-header';
import { ArticleForm } from '@/features/articles/article-form';

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getPortalSession();
  const { id } = await params;

  let article;
  try {
    article = await getArticle(id);
  } catch {
    article = null;
  }
  if (!article) notFound();

  if (!canEditCatalog(session?.role)) {
    redirect('/dashboard/learn');
  }

  return (
    <div>
      <PageHeader title={article.title} description={`ID: ${article.id}`} />
      <ArticleForm article={article} />
    </div>
  );
}
