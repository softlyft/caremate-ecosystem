import { format } from 'date-fns';
import { requireProviderSession } from '@/lib/auth';
import { listConnectionsByStatus } from '@/domains/connections/repository';
import { ConnectionActions } from '@/components/features/connection-actions';
import { RequestConnectionForm } from '@/components/features/request-connection-form';
import { canWriteOrg } from '@/constants/roles';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function ConnectionRequestsPage() {
  const session = await requireProviderSession();
  const requests = await listConnectionsByStatus(session.activeOrganizationId, 'pending');
  const canWrite = canWriteOrg(session.activeRole);

  const inbound = requests.filter((r) => r.initiated_by === 'patient');
  const outbound = requests.filter((r) => r.initiated_by === 'provider');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
          Connection requests
        </h1>
        <p className="mt-1 text-sm text-muted">
          Request a connection with a CareMate patient, or approve patients who want to connect
        </p>
      </div>

      {canWrite ? (
        <Card>
          <CardHeader>
            <CardTitle>Request a connection</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted">
              Enter the patient&apos;s 12-digit CareMate ID. No clinical data is shared — this only
              creates a connection record. The patient must approve in the CareMate app.
            </p>
            <RequestConnectionForm />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Awaiting your review ({inbound.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>CareMate ID</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {inbound.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted">
                    No patient requests waiting for approval.
                  </TableCell>
                </TableRow>
              ) : (
                inbound.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.profile?.full_name ?? 'Unknown'}
                    </TableCell>
                    <TableCell>{r.profile?.patient_id ?? '—'}</TableCell>
                    <TableCell>{r.profile?.phone ?? '—'}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {r.patient_note ?? '—'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(r.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="warning">{r.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {canWrite ? <ConnectionActions connectionId={r.id} /> : null}
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
          <CardTitle>Awaiting patient ({outbound.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>CareMate ID</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Your note</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {outbound.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted">
                    No outbound requests waiting on patients.
                  </TableCell>
                </TableRow>
              ) : (
                outbound.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.profile?.full_name ?? 'Unknown'}
                    </TableCell>
                    <TableCell>{r.profile?.patient_id ?? '—'}</TableCell>
                    <TableCell>{r.profile?.phone ?? '—'}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {r.provider_note ?? '—'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(r.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="warning">awaiting patient</Badge>
                    </TableCell>
                    <TableCell>
                      {canWrite ? (
                        <ConnectionActions connectionId={r.id} showApprove={false} />
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
