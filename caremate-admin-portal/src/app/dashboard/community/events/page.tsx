import { format } from 'date-fns';
import { listEventsPage } from '@/domains/community/repository';
import { getCommunityManageSession } from '@/lib/community-access';
import { emptyPage, parsePage, type PaginatedResult } from '@/lib/pagination';
import { PageHeader } from '@/components/page-header';
import { PaginationBar } from '@/components/pagination-bar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { CommunityEvent } from '@/types/community';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function eventsHref(page?: number): string {
  const params = new URLSearchParams();
  if (page && page > 1) params.set('page', String(page));
  const qs = params.toString();
  return `/dashboard/community/events${qs ? `?${qs}` : ''}`;
}

export default async function CommunityEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getCommunityManageSession();
  if (!session) {
    return (
      <div>
        <PageHeader
          title="Events"
          description="You do not have permission to manage community."
        />
      </div>
    );
  }

  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  let events: PaginatedResult<CommunityEvent & { chapter_name?: string }> = emptyPage(page);
  try {
    events = await listEventsPage({ page });
  } catch {
    events = emptyPage(page);
  }

  const hrefForPage = (nextPage: number) => eventsHref(nextPage);

  return (
    <div>
      <PageHeader
        title="Community events"
        description="Overview of events across all chapters."
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Chapter</TableHead>
                <TableHead>Starts</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Registration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted">
                    No events found.
                  </TableCell>
                </TableRow>
              ) : (
                events.rows.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell className="font-medium">{ev.title}</TableCell>
                    <TableCell className="text-muted">{ev.chapter_name ?? '—'}</TableCell>
                    <TableCell className="text-muted">
                      {format(new Date(ev.starts_at), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="text-muted">{ev.location ?? '—'}</TableCell>
                    <TableCell>
                      {ev.registration_open ? (
                        <Badge variant="success">Open</Badge>
                      ) : (
                        <Badge variant="secondary">Closed</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <PaginationBar result={events} hrefForPage={hrefForPage} />
        </CardContent>
      </Card>
    </div>
  );
}
