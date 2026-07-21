import Link from 'next/link';
import { requireLeaderAccess } from '@/lib/auth';
import { listEvents } from '@/domains/events/repository';
import { createEventAction, exportAttendanceCsvAction } from '@/domains/events/actions';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function ManageEventsPage() {
  const session = await requireLeaderAccess();
  const events = await listEvents(session.activeChapterId);

  const csvByEventId = new Map<string, string>();
  await Promise.all(
    events.map(async (event) => {
      const csv = await exportAttendanceCsvAction(event.id);
      csvByEventId.set(event.id, csv);
    }),
  );

  return (
    <div className="space-y-8">
      <div>
        <Link href="/app/events" className="text-sm text-primary hover:underline">
          ← Events
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-brand-navy">
          Manage events
        </h1>
        <p className="mt-1 text-sm text-muted">
          Create and export attendance for {session.activeChapterName}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create event</CardTitle>
          <CardDescription>Publish a new chapter event</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createEventAction} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="starts_at">Starts at</Label>
              <Input id="starts_at" name="starts_at" type="datetime-local" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ends_at">Ends at</Label>
              <Input id="ends_at" name="ends_at" type="datetime-local" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input id="capacity" name="capacity" type="number" min={1} />
            </div>
            <div className="sm:col-span-2">
              <SubmitButton loadingLabel="Creating…">Create event</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {events.length === 0 ? (
            <p className="text-sm text-muted">No events yet.</p>
          ) : (
            events.map((event) => {
              const csv = csvByEventId.get(event.id) ?? '';
              return (
                <div
                  key={event.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div>
                    <Link
                      href={`/app/events/${event.id}`}
                      className="font-medium hover:text-primary"
                    >
                      {event.title}
                    </Link>
                    <p className="text-xs text-muted">
                      {new Date(event.starts_at).toLocaleString()}
                    </p>
                  </div>
                  <a
                    className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm hover:bg-surface-muted"
                    href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
                    download={`attendance-${event.id}.csv`}
                  >
                    Export CSV
                  </a>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
