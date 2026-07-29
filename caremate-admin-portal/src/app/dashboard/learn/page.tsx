import Link from 'next/link';
import { listArticlesPage } from '@/domains/articles/repository';
import { getPortalSession } from '@/lib/auth';
import { canEditCatalog } from '@/constants/roles';
import { LEARN_CONTENT_TYPES, LEARN_CONTENT_TYPE_LABELS } from '@/constants/content';
import { HEALTH_CATEGORIES } from '@/constants/categories';
import { emptyPage, parsePage, type PaginatedResult } from '@/lib/pagination';
import { PageHeader } from '@/components/page-header';
import { PaginationBar } from '@/components/pagination-bar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Article } from '@/types/database';

function learnHref(opts: { q?: string; type?: string; category?: string; page?: number }): string {
  const params = new URLSearchParams();
  if (opts.q?.trim()) params.set('q', opts.q.trim());
  if (opts.type) params.set('type', opts.type);
  if (opts.category) params.set('category', opts.category);
  if (opts.page && opts.page > 1) params.set('page', String(opts.page));
  const qs = params.toString();
  return `/dashboard/learn${qs ? `?${qs}` : ''}`;
}

export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; category?: string; page?: string }>;
}) {
  const session = await getPortalSession();
  const canEdit = canEditCatalog(session?.role);
  const { q, type, category, page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  let articles: PaginatedResult<Article> = emptyPage(page);
  try {
    articles = await listArticlesPage({
      search: q,
      contentType: type || undefined,
      categoryId: category || undefined,
      page,
    });
  } catch {
    articles = emptyPage(page);
  }

  const hrefForPage = (nextPage: number) => learnHref({ q, type, category, page: nextPage });

  return (
    <div>
      <PageHeader
        title="Learn content"
        description="Manage articles and other Learn catalog items synced to the app."
        actionHref={canEdit ? '/dashboard/learn/new' : undefined}
        actionLabel={canEdit ? 'New item' : undefined}
      />

      <form className="mb-4 flex flex-wrap gap-2">
        <Input name="q" defaultValue={q} placeholder="Search title…" className="max-w-xs" />
        <Select name="type" defaultValue={type ?? ''} className="w-40">
          <option value="">All types</option>
          {LEARN_CONTENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {LEARN_CONTENT_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
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

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {articles.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted">
                    No learn items yet.
                  </TableCell>
                </TableRow>
              ) : (
                articles.rows.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/learn/${a.id}`}
                        className="font-medium text-primary-dark hover:underline"
                      >
                        {a.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {LEARN_CONTENT_TYPE_LABELS[
                          a.content_type as keyof typeof LEARN_CONTENT_TYPE_LABELS
                        ] ?? a.content_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted">{a.category_name ?? '—'}</TableCell>
                    <TableCell>
                      {a.published_at ? (
                        <Badge variant="success">Published</Badge>
                      ) : (
                        <Badge variant="warning">Draft</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <PaginationBar result={articles} hrefForPage={hrefForPage} />
        </CardContent>
      </Card>
    </div>
  );
}
