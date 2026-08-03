import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { requireProviderSession } from '@/lib/auth';
import { canManageOrg } from '@/constants/roles';
import { getPatientDetail } from '@/domains/patients/repository';
import { DOCUMENT_TYPE_LABELS } from '@/constants/document-types';
import { MarkAsStaffForm } from '@/components/features/mark-as-staff-form';
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

  const { profile, connection, emergency, documents, activities, gender, membership } = detail;
  const contacts = emergency?.emergency_contacts;
  const canManage = canManageOrg(session.activeRole);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
              {profile?.full_name ?? 'Patient'}
            </h1>
            {membership ? <Badge variant="default">Staff</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted">
            CareMate ID: {profile?.patient_id ?? '—'} · Connected{' '}
            {connection.approved_at
              ? format(new Date(connection.approved_at), 'MMM d, yyyy')
              : '—'}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Basic information</CardTitle>
            <CardDescription>Shared profile fields</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Name" value={profile?.full_name ?? '—'} />
            <Row label="Photo" value={profile?.avatar_url ? 'Available' : '—'} />
            <Row label="Gender" value={gender} />
            <Row
              label="DOB"
              value={
                profile?.date_of_birth
                  ? format(new Date(profile.date_of_birth), 'MMM d, yyyy')
                  : '—'
              }
            />
            <Row label="Phone" value={profile?.phone ?? '—'} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Organization staff</CardTitle>
            <CardDescription>
              Elevate a connected CareMate user to staff for this organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MarkAsStaffForm
              patientUserId={connection.patient_id}
              defaultDisplayName={profile?.full_name ?? ''}
              membership={membership}
              canManage={canManage}
            />
          </CardContent>
        </Card>

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
                <Row label="Blood group" value={emergency.blood_group ?? '—'} />
                <Row label="Allergies" value={jsonList(emergency.allergies)} />
                <Row
                  label="Medical conditions"
                  value={jsonList(emergency.chronic_conditions)}
                />
                <Row label="Insurance" value={emergency.insurance_provider ?? '—'} />
                <Row label="Emergency contacts" value={jsonList(contacts)} />
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
          <CardTitle>Shared documents</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Uploaded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted">
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}
