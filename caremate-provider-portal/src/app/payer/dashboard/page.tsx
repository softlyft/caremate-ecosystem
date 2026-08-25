import Link from 'next/link';
import { requirePayerSession } from '@/lib/auth';
import { getPayerOrganizationProfile } from '@/domains/payer/repository';
import { listPayerProviderConnectionsByStatus } from '@/domains/payer-connections/repository';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function PayerDashboardPage() {
  const session = await requirePayerSession();
  const data = await getPayerOrganizationProfile(session.activeOrganizationId);
  const verification = data?.profile?.verification_status ?? 'pending';

  const [connected, inbound] = await Promise.all([
    listPayerProviderConnectionsByStatus(session.activeOrganizationId, 'approved', {
      page: 1,
      pageSize: 1,
    }),
    listPayerProviderConnectionsByStatus(session.activeOrganizationId, 'pending', {
      page: 1,
      pageSize: 1,
      initiatedBy: 'provider',
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            Welcome to Care Portal for {session.activeOrganizationName}
          </p>
        </div>
        <Badge
          variant={
            verification === 'verified'
              ? 'success'
              : verification === 'suspended'
                ? 'danger'
                : 'warning'
          }
        >
          {verification}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Connected providers</CardTitle>
            <CardDescription>Approved network links</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-semibold text-brand-navy">{connected.total}</p>
            <Link
              href="/payer/providers"
              className="text-sm font-medium text-primary hover:underline"
            >
              View connected providers →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending requests</CardTitle>
            <CardDescription>Awaiting your review</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-semibold text-brand-navy">{inbound.total}</p>
            <Link
              href="/payer/providers/requests"
              className="text-sm font-medium text-primary hover:underline"
            >
              Review connection requests →
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>
            Keep directory contact details current for patients and providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/payer/organization"
            className="text-sm font-medium text-primary hover:underline"
          >
            Edit organization profile →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
