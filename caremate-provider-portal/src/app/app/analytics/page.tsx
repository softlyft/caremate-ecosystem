import { requireProviderSession } from '@/lib/auth';
import { requireModule } from '@/domains/modules/guard';
import { getAnalyticsSnapshot } from '@/domains/analytics/repository';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">Analytics</h1>
        <p className="mt-1 text-sm text-muted">Simple engagement metrics for your organization</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {summary.map((item) => (
          <Card key={item.label}>
            <CardContent className="p-5">
              <p className="text-2xl font-semibold">{item.value}</p>
              <p className="text-sm text-muted">{item.label}</p>
            </CardContent>
          </Card>
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
    </div>
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
