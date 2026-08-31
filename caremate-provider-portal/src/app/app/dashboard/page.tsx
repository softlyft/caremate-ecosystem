import { formatDistanceToNow } from 'date-fns';
import { Users, UserPlus, FileText, Megaphone, Upload, Send } from 'lucide-react';
import { requireProviderSession } from '@/lib/auth';
import { requireModule } from '@/domains/modules/guard';
import { listRecentActivities } from '@/domains/activity/repository';
import { getAnalyticsSnapshot } from '@/domains/analytics/repository';
import { PageHeader, PageShell } from '@/components/page-header';
import { DashboardMetricGrid } from '@/components/features/dashboard-metric-card';
import { DashboardQuickActions } from '@/components/features/dashboard-quick-actions';
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

  return (
    <PageShell spacing="loose">
      <PageHeader
        title="Dashboard"
        description={`Patient engagement overview for ${session.activeOrganizationName}`}
      />

      <DashboardMetricGrid
        columns="sm:grid-cols-2 lg:grid-cols-3"
        metrics={[
          {
            label: 'Connected Patients',
            value: metrics.connectedPatients,
            icon: Users,
            href: '/app/patients',
          },
          {
            label: 'Pending Requests',
            value: metrics.pendingRequests,
            icon: UserPlus,
            href: '/app/patients/requests',
          },
          {
            label: 'Shared Documents',
            value: metrics.documentsShared,
            icon: FileText,
            href: '/app/documents',
          },
          {
            label: 'Broadcasts Sent',
            value: metrics.broadcastsSent,
            icon: Megaphone,
            href: '/app/broadcasts',
          },
        ]}
      />

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

        <DashboardQuickActions
          actions={[
            { label: 'Send broadcast', href: '/app/broadcasts', icon: Send, variant: 'primary' },
            { label: 'Upload document', href: '/app/documents', icon: Upload },
            { label: 'View patients', href: '/app/patients', icon: Users },
          ]}
        />
      </div>
    </PageShell>
  );
}
