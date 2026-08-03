import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  Users,
  UserPlus,
  CalendarDays,
  FileText,
  Megaphone,
  Upload,
  Send,
} from 'lucide-react';
import { requireProviderSession } from '@/lib/auth';
import { requireModule } from '@/domains/modules/guard';
import { listRecentActivities } from '@/domains/activity/repository';
import { getAnalyticsSnapshot } from '@/domains/analytics/repository';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function DashboardPage() {
  await requireModule('dashboard');
  const session = await requireProviderSession();
  const orgId = session.activeOrganizationId;
  const [metrics, activities] = await Promise.all([
    getAnalyticsSnapshot(orgId),
    listRecentActivities(orgId, 10),
  ]);

  const cards = [
    { label: 'Connected Patients', value: metrics.connectedPatients, icon: Users, href: '/app/patients' },
    { label: 'Pending Requests', value: metrics.pendingRequests, icon: UserPlus, href: '/app/patients/requests' },
    { label: 'Appointment Requests', value: metrics.appointmentRequests, icon: CalendarDays, href: '/app/appointments' },
    { label: 'Shared Documents', value: metrics.documentsShared, icon: FileText, href: '/app/documents' },
    { label: 'Broadcasts Sent', value: metrics.broadcastsSent, icon: Megaphone, href: '/app/broadcasts' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Patient engagement overview for {session.activeOrganizationName}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest interactions with connected patients</CardDescription>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-sm text-muted">No activity yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {activities.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{a.summary}</p>
                      <Badge variant="secondary" className="mt-1">
                        {a.event_type}
                      </Badge>
                    </div>
                    <p className="shrink-0 text-xs text-muted">
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>Common engagement tasks</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Link
              href="/app/broadcasts"
              className="inline-flex h-10 items-center justify-start gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-dark"
            >
              <Send className="h-4 w-4" />
              Send broadcast
            </Link>
            <Link
              href="/app/documents"
              className="inline-flex h-10 items-center justify-start gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-surface-muted"
            >
              <Upload className="h-4 w-4" />
              Upload document
            </Link>
            <Link
              href="/app/patients"
              className="inline-flex h-10 items-center justify-start gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-surface-muted"
            >
              <Users className="h-4 w-4" />
              View patients
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
