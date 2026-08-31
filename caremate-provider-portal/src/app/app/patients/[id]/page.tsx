import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { requireProviderSession } from '@/lib/auth';
import { canManageOrg, canWriteOrg } from '@/constants/roles';
import { getPatientDetail } from '@/domains/patients/repository';
import { DOCUMENT_TYPE_LABELS } from '@/constants/document-types';
import { PatientDetailHeader } from '@/components/features/patient-detail-header';
import { PatientStaffAndSeatSection } from '@/components/features/patient-staff-and-seat-section';
import { DetailRow } from '@/components/ui/detail-row';
import { getProviderOrgPlanUsage } from '@/domains/billing/repository';
import { OpenDocumentButton } from '@/components/features/open-document-button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function jsonList(value: unknown): string {
  if (Array.isArray(value)) {
    return value.length ? value.map(String).join(', ') : '—';
  }
  if (value == null) return '—';
  return String(value);
}

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireProviderSession();
  const { id } = await params;
  const detail = await getPatientDetail(session.activeOrganizationId, id);
  if (!detail) notFound();

  const usage = await getProviderOrgPlanUsage(session.activeOrganizationId);

  const { profile, connection, emergency, documents, activities, gender, membership, healthTimelineConsent, healthTimelineEvents } =
    detail;
  const contacts = emergency?.emergency_contacts;
  const canManage = canManageOrg(session.activeRole);
  const canWrite = canWriteOrg(session.activeRole);

  return (
    <div className="space-y-6">
      <PatientDetailHeader
        fullName={profile?.full_name ?? 'Patient'}
        staffBadge={Boolean(membership)}
        patientId={profile?.patient_id ?? null}
        connectedAt={connection.approved_at}
        connectionId={connection.id}
        canWrite={canWrite}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Basic information</CardTitle>
            <CardDescription>Shared profile fields</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <DetailRow label="Name" value={profile?.full_name ?? '—'} />
            <DetailRow label="Photo" value={profile?.avatar_url ? 'Available' : '—'} />
            <DetailRow label="Gender" value={gender} />
            <DetailRow
              label="DOB"
              value={
                profile?.date_of_birth
                  ? format(new Date(profile.date_of_birth), 'MMM d, yyyy')
                  : '—'
              }
            />
            <DetailRow label="Phone" value={profile?.phone ?? '—'} />
          </CardContent>
        </Card>

        <PatientStaffAndSeatSection
          patientUserId={connection.patient_id}
          defaultDisplayName={profile?.full_name ?? ''}
          membership={membership}
          canManage={canManage}
          staffDescription="Elevate a connected CareMate user to staff for this organization"
          teamName="Private Care Team"
          teamDescription="Designated members patients can message 1:1 (plan seats required)"
          onTeam={Boolean(membership?.private_care_team)}
          seatsUsed={usage.pctMemberCount}
          seatLimit={usage.entitlements.pct_seat_limit}
        />

        <Card>
          <CardHeader>
            <CardTitle>Emergency information</CardTitle>
            <CardDescription>
              Visible only after the patient grants emergency profile consent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {!(connection.shared_scopes ?? []).includes('emergency') ? (
              <p className="text-muted">
                Patient has not given consent to share their emergency profile yet.
              </p>
            ) : emergency ? (
              <>
                <DetailRow label="Blood group" value={emergency.blood_group ?? '—'} />
                <DetailRow label="Allergies" value={jsonList(emergency.allergies)} />
                <DetailRow
                  label="Medical conditions"
                  value={jsonList(emergency.chronic_conditions)}
                />
                <DetailRow label="Insurance" value={emergency.insurance_provider ?? '—'} />
                <DetailRow label="Emergency contacts" value={jsonList(contacts)} />
              </>
            ) : (
              <p className="text-muted">
                Consent is granted, but no emergency profile is available yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Health timeline</CardTitle>
          <CardDescription>
            View-only logs the patient shared for a date range. This is not a download or export.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!(connection.shared_scopes ?? []).includes('health_timeline') || !healthTimelineConsent ? (
            <p className="text-muted">Patient has not shared their health timeline.</p>
          ) : (
            <>
              <p className="text-muted">
                Consented window: {healthTimelineConsent.periodStart} to{' '}
                {healthTimelineConsent.periodEnd}
              </p>
              {healthTimelineEvents.length === 0 ? (
                <p className="text-muted">No logs in the consented date range.</p>
              ) : (
                <ul className="space-y-3">
                  {healthTimelineEvents.map((event) => (
                    <li
                      key={event.id}
                      className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-0"
                    >
                      <div>
                        <p className="font-medium text-foreground">{event.title}</p>
                        {event.summary ? (
                          <p className="mt-0.5 text-muted">{event.summary}</p>
                        ) : null}
                        <p className="mt-1 text-xs uppercase tracking-wide text-muted">
                          {event.app_key}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted">{event.occurred_on}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shared documents</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="w-[1%] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted">
                    No documents shared yet.
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>{doc.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(doc.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <OpenDocumentButton documentId={doc.id} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-sm text-muted">No activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {activities.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{a.summary}</p>
                    <Badge className="mt-1" variant="secondary">
                      {a.event_type}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted">
                    {format(new Date(a.created_at), 'MMM d, yyyy HH:mm')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
