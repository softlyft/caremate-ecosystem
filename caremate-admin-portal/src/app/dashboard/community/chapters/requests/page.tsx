import { formatDistanceToNow } from 'date-fns';
import { listChapterRequestsPage } from '@/domains/community/repository';
import { ChapterRequestActions } from '@/features/community/chapter-request-actions';
import { emptyPage, parsePage, type PaginatedResult } from '@/lib/pagination';
import { PageHeader } from '@/components/page-header';
import { PaginationBar } from '@/components/pagination-bar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { CommunityChapterRequest } from '@/types/community';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function requestsHref(page?: number): string {
  const params = new URLSearchParams();
  if (page && page > 1) params.set('page', String(page));
  const qs = params.toString();
  return `/dashboard/community/chapters/requests${qs ? `?${qs}` : ''}`;
}

export default async function CommunityChapterRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  let requests: PaginatedResult<CommunityChapterRequest> = emptyPage(page);
  try {
    requests = await listChapterRequestsPage({ status: 'pending', page });
  } catch {
    requests = emptyPage(page);
  }

  const hrefForPage = (nextPage: number) => requestsHref(nextPage);

  return (
    <div>
      <PageHeader
        title="Chapter requests"
        description="Pending proposals to create new community chapters."
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted">
                    No pending chapter requests.
                  </TableCell>
                </TableRow>
              ) : (
                requests.rows.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div className="font-medium">{req.name}</div>
                      {req.description ? (
                        <div className="mt-0.5 line-clamp-2 text-xs text-muted">
                          {req.description}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{req.chapter_type}</Badge>
                    </TableCell>
                    <TableCell className="text-muted">{req.country_code}</TableCell>
                    <TableCell className="text-muted">
                      {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <ChapterRequestActions requestId={req.id} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <PaginationBar result={requests} hrefForPage={hrefForPage} />
        </CardContent>
      </Card>
    </div>
  );
}
