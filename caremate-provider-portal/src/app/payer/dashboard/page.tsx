import { requirePayerSession } from '@/lib/auth';
import { getPayerDashboardSnapshot } from '@/domains/payer-dashboard/repository';
import { PageHeader, PageShell } from '@/components/page-header';
import { DashboardMetricGrid } from '@/components/features/dashboard-metric-card';
import { DashboardQuickActions } from '@/components/features/dashboard-quick-actions';
import { Badge } from '@/components/ui/badge';
import { CardLink } from '@/components/ui/card-link';
import { Users, UserPlus, FileText, Megaphone, Hospital, Upload, Send } from 'lucide-react';

export default async function PayerDashboardPage() {
  const session = await requirePayerSession();
  const snapshot = await getPayerDashboardSnapshot(session.activeOrganizationId);
  const { verificationStatus } = snapshot;

  return (
    <PageShell spacing="loose">
      <PageHeader
        title="Dashboard"
        description={`Patient engagement overview for ${session.activeOrganizationName}`}
        actions={
          <Badge
            variant={
              verificationStatus === 'verified'
                ? 'success'
                : verificationStatus === 'suspended'
                  ? 'danger'
                  : 'warning'
            }
          >
            {verificationStatus}
          </Badge>
        }
      />

      <DashboardMetricGrid
        title="Network"
        columns="sm:grid-cols-2"
        metrics={[
          {
            label: 'Connected Providers',
            value: snapshot.connectedProviders,
            icon: Hospital,
            href: '/payer/providers',
          },
          {
            label: 'Provider Requests',
            value: snapshot.inboundProviderRequests,
            icon: UserPlus,
            href: '/payer/providers/requests',
          },
        ]}
      />

      <DashboardMetricGrid
        title="Engagement"
        metrics={[
          {
            label: 'Connected Patients',
            value: snapshot.connectedPatients,
            icon: Users,
            href: '/payer/patients',
          },
          {
            label: 'Patient Requests',
            value: snapshot.inboundPatientRequests,
            icon: UserPlus,
            href: '/payer/patients/requests',
          },
          {
            label: 'Shared Documents',
            value: snapshot.documentsShared,
            icon: FileText,
            href: '/payer/documents',
          },
          {
            label: 'Message Threads',
            value: snapshot.messageThreads,
            icon: Megaphone,
            href: '/payer/broadcasts',
          },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <CardLink
          className="lg:col-span-2"
          title="Organization"
          description="Keep directory contact details current for patients and providers"
          href="/payer/organization"
          linkLabel="Edit organization profile →"
        />

        <DashboardQuickActions
          actions={[
            {
              label: 'Send message',
              href: '/payer/broadcasts',
              icon: Send,
              variant: 'primary',
            },
            { label: 'Upload document', href: '/payer/documents', icon: Upload },
            { label: 'View patients', href: '/payer/patients', icon: Users },
          ]}
        />
      </div>
    </PageShell>
  );
}
