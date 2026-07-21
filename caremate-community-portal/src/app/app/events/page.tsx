import Link from 'next/link';
import { requireCommunitySession } from '@/lib/auth';
import { listEvents } from '@/domains/events/repository';
import { isUpcomingEvent } from '@/lib/event-time';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function EventsPage() {
  const session = await requireCommunitySession();
  const events = await listEvents(session.activeChapterId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">Events</h1>
          <p className="mt-1 text-sm text-muted">Chapter gatherings and workshops</p>
        </div>
        {session.isLeader && (
          <Link
            href="/app/events/manage"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-dark"
          >
            Manage events
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All events</CardTitle>
          <CardDescription>{events.length} events in {session.activeChapterName}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {events.length === 0 ? (
            <p className="text-sm text-muted">No events scheduled yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => {
                  const upcoming = isUpcomingEvent(event.starts_at);
                  return (
                    <TableRow key={event.id}>
                      <TableCell>
                        <Link
                          href={`/app/events/${event.id}`}
                          className="font-medium text-foreground hover:text-primary"
                        >
                          {event.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted">
                        {new Date(event.starts_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted">
                        {event.location || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={upcoming ? 'default' : 'secondary'}>
                          {upcoming ? 'Upcoming' : 'Past'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
