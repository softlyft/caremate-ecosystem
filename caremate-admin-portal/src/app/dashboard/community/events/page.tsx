import { format } from 'date-fns';
import { listEvents } from '@/domains/community/repository';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function CommunityEventsPage() {
  let events: Awaited<ReturnType<typeof listEvents>> = [];
  try {
    events = await listEvents();
  } catch {
    events = [];
  }

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
              {events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted">
                    No events found.
                  </TableCell>
                </TableRow>
              ) : (
                events.map((ev) => (
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
        </CardContent>
      </Card>
    </div>
  );
}
