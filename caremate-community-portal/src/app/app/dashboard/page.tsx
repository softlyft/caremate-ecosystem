import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { CalendarDays, Award, Users, FolderOpen, Megaphone } from 'lucide-react';
import { requireCommunitySession } from '@/lib/auth';
import { listEvents } from '@/domains/events/repository';
import { listAnnouncements } from '@/domains/announcements/repository';
import { getSummary } from '@/domains/contributions/repository';
import { getChapterLeaderboard } from '@/domains/leaderboard/repository';
import { isUpcomingEvent } from '@/lib/event-time';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function DashboardPage() {
  const session = await requireCommunitySession();
  const chapterId = session.activeChapterId;

  const [events, announcements, summary, leaderboard] = await Promise.all([
    listEvents(chapterId),
    listAnnouncements(chapterId),
    getSummary(session.user.id),
    getChapterLeaderboard(chapterId, 5),
  ]);

  const upcoming = events.filter((e) => isUpcomingEvent(e.starts_at)).slice(0, 5);
  const recentAnnouncements = announcements.slice(0, 5);

  const cards = [
    { label: 'Your points', value: summary.totalPoints, icon: Award, href: '/app/recognition' },
    { label: 'Upcoming events', value: upcoming.length, icon: CalendarDays, href: '/app/events' },
    { label: 'Announcements', value: announcements.length, icon: Megaphone, href: '/app/community' },
    { label: 'Actions logged', value: summary.totalActions, icon: FolderOpen, href: '/app/profile' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Welcome back to {session.activeChapterName}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-light text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">{value}</p>
                  <p className="text-sm text-muted">{label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Upcoming events</CardTitle>
            <CardDescription>Next gatherings for your chapter</CardDescription>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted">No upcoming events yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {upcoming.map((event) => (
                  <li key={event.id} className="flex items-start justify-between gap-4 py-3">
                    <div>
                      <Link
                        href={`/app/events/${event.id}`}
                        className="text-sm font-medium text-foreground hover:text-primary"
                      >
                        {event.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted">
                        {event.location || 'Location TBD'} ·{' '}
                        {new Date(event.starts_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {formatDistanceToNow(new Date(event.starts_at), { addSuffix: true })}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chapter leaders</CardTitle>
            <CardDescription>Top contributors this chapter</CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboard.length === 0 ? (
              <p className="text-sm text-muted">No points yet.</p>
            ) : (
              <ul className="space-y-3">
                {leaderboard.map((entry, idx) => (
                  <li key={entry.userId} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-medium">{entry.fullName}</span>
                    </div>
                    <span className="text-sm text-muted">{entry.totalPoints} pts</span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/app/community"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              <Users className="h-4 w-4" />
              View community
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent announcements</CardTitle>
          <CardDescription>Updates from chapter leaders</CardDescription>
        </CardHeader>
        <CardContent>
          {recentAnnouncements.length === 0 ? (
            <p className="text-sm text-muted">No announcements yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentAnnouncements.map((a) => (
                <li key={a.id} className="py-3">
                  <p className="text-sm font-medium text-foreground">{a.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{a.body}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
