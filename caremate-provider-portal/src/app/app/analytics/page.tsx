import { requireProviderSession } from '@/lib/auth';
import { requireModule } from '@/domains/modules/guard';
import { getAnalyticsSnapshot } from '@/domains/analytics/repository';
import { PageHeader, PageShell } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';

export default async function AnalyticsPage() {
  await requireModule('analytics');
  const session = await requireProviderSession();
  const metrics = await getAnalyticsSnapshot(session.activeOrganizationId);

  const summary = [
    { label: 'Connected patients', value: metrics.connectedPatients },
    { label: 'New patients this month', value: metrics.newPatientsThisMonth },
    { label: 'Documents shared', value: metrics.documentsShared },
    { label: 'Broadcasts sent', value: metrics.broadcastsSent },
    { label: 'Appointment requests', value: metrics.appointmentRequests },
    { label: 'Messages delivered', value: metrics.messagesDelivered },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Analytics"
        description="Simple engagement metrics for your organization"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {summary.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Patient growth</CardTitle>
            <CardDescription>Approved connections by month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {metrics.patientGrowth.map((row) => (
              <BarRow key={row.month} label={row.month} value={row.count} max={Math.max(...metrics.patientGrowth.map((r) => r.count), 1)} />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Documents uploaded</CardTitle>
            <CardDescription>Uploads by month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {metrics.documentsByMonth.map((row) => (
              <BarRow
                key={row.month}
                label={row.month}
                value={row.count}
                max={Math.max(...metrics.documentsByMonth.map((r) => r.count), 1)}
              />
            ))}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const width = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-16 shrink-0 text-muted">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
      </div>
      <span className="w-8 text-right font-medium">{value}</span>
    </div>
  );
}
