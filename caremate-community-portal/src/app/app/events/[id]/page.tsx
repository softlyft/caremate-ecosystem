import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireCommunitySession } from '@/lib/auth';
import { getEvent, listRegistrations } from '@/domains/events/repository';
import {
  cancelRegistrationAction,
  markAttendanceAction,
  registerAction,
} from '@/domains/events/actions';
import { Badge } from '@/components/ui/badge';
import { SubmitButton } from '@/components/ui/submit-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireCommunitySession();
  const event = await getEvent(id);
  if (!event || event.chapter_id !== session.activeChapterId) {
    notFound();
  }

  const registrations = await listRegistrations(id);
  const ownStatus = registrations.find((r) => r.user_id === session.user.id)?.status ?? null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/events" className="text-sm text-primary hover:underline">
          ← Back to events
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-brand-navy">
          {event.title}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {new Date(event.starts_at).toLocaleString()}
          {event.location ? ` · ${event.location}` : ''}
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Details</CardTitle>
            <Badge variant={event.registration_open ? 'default' : 'secondary'}>
              {event.registration_open ? 'Registration open' : 'Registration closed'}
            </Badge>
            {ownStatus && <Badge variant="secondary">You: {ownStatus}</Badge>}
          </div>
          <CardDescription>{event.description || 'No description provided.'}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {event.registration_open && ownStatus !== 'registered' && ownStatus !== 'attended' && (
            <form action={registerAction}>
              <input type="hidden" name="event_id" value={event.id} />
              <SubmitButton loadingLabel="Registering…">Register</SubmitButton>
            </form>
          )}
          {ownStatus === 'registered' && (
            <form action={cancelRegistrationAction}>
              <input type="hidden" name="event_id" value={event.id} />
              <SubmitButton variant="secondary" loadingLabel="Cancelling…">
                Cancel registration
              </SubmitButton>
            </form>
          )}
        </CardContent>
      </Card>

      {session.isLeader && (
        <Card>
          <CardHeader>
            <CardTitle>Attendance</CardTitle>
            <CardDescription>{registrations.length} registrations</CardDescription>
          </CardHeader>
          <CardContent>
            {registrations.length === 0 ? (
              <p className="text-sm text-muted">No registrations yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {registrations.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{r.user_id}</p>
                      <p className="text-xs text-muted">
                        {r.status} · registered {new Date(r.registered_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <form action={markAttendanceAction}>
                        <input type="hidden" name="event_id" value={event.id} />
                        <input type="hidden" name="user_id" value={r.user_id} />
                        <input type="hidden" name="attended" value="true" />
                        <SubmitButton size="sm" loadingLabel="Saving…">
                          Attended
                        </SubmitButton>
                      </form>
                      <form action={markAttendanceAction}>
                        <input type="hidden" name="event_id" value={event.id} />
                        <input type="hidden" name="user_id" value={r.user_id} />
                        <input type="hidden" name="attended" value="false" />
                        <SubmitButton size="sm" variant="secondary" loadingLabel="Saving…">
                          No-show
                        </SubmitButton>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
