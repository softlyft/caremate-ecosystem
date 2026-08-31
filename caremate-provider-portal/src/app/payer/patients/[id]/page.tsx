import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { TextLink } from '@/components/ui/text-link';
import { requirePayerSession } from '@/lib/auth';
import { canManageOrg, canWriteOrg } from '@/constants/roles';
import { getPayerPatientDetail } from '@/domains/payer-patients/repository';
import { getPayerOrgPlanUsage } from '@/domains/payer-billing/repository';
import { PatientDetailHeader } from '@/components/features/patient-detail-header';
import { PatientStaffAndSeatSection } from '@/components/features/patient-staff-and-seat-section';
import { markPayerStaffAction } from '@/domains/payer-members/actions';
import { setSupportTeamMemberAction } from '@/domains/payer-billing/actions';
import { payerPatientConnectionHandlers } from '@/lib/connection-action-handlers';
import { DetailRow } from '@/components/ui/detail-row';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function PayerPatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePayerSession();
  const { id } = await params;
  const detail = await getPayerPatientDetail(session.activeOrganizationId, id);
  if (!detail) notFound();

  const usage = await getPayerOrgPlanUsage(session.activeOrganizationId);
  const { profile, connection, membership } = detail;
  const canManage = canManageOrg(session.activeRole);
  const canWrite = canWriteOrg(session.activeRole);

  return (
    <div className="space-y-6">
      <PatientDetailHeader
        fullName={profile?.full_name ?? 'Patient'}
        staffBadge={Boolean(membership)}
        extraBadges={
          membership?.support_team ? <Badge variant="secondary">Support Team</Badge> : null
        }
        patientId={profile?.patient_id ?? null}
        connectedAt={connection.approved_at}
        connectionId={connection.id}
        canWrite={canWrite}
        connectionHandlers={payerPatientConnectionHandlers}
        connectionErrorMapper="payer-patient"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Basic information</CardTitle>
            <CardDescription>Shared profile fields</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <DetailRow label="Name" value={profile?.full_name ?? '—'} />
            <DetailRow label="Phone" value={profile?.phone ?? '—'} />
            <DetailRow
              label="DOB"
              value={
                profile?.date_of_birth
                  ? format(new Date(profile.date_of_birth), 'MMM d, yyyy')
                  : '—'
              }
            />
          </CardContent>
        </Card>

        <PatientStaffAndSeatSection
          patientUserId={connection.patient_id}
          defaultDisplayName={profile?.full_name ?? ''}
          membership={membership}
          canManage={canManage}
          markAction={markPayerStaffAction}
          staffDescription="Elevate a connected CareMate user to staff for this payer organization"
          positionPlaceholder="e.g. Claims specialist"
          teamName="Support Team"
          teamDescription="Seat-gated 1:1 patient chat (text and voice). Mark as staff first, then add to the team."
          onTeam={Boolean(membership?.support_team)}
          seatsUsed={usage.supportTeamMemberCount}
          seatLimit={usage.entitlements.support_team_seat_limit}
          toggleAction={setSupportTeamMemberAction}
          teamCardFullWidth
        />
      </div>

      <TextLink href="/payer/patients">← Back to connected patients</TextLink>
    </div>
  );
}
