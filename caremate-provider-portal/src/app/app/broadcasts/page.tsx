import { format } from 'date-fns';
import { requireProviderSession } from '@/lib/auth';
import { listBroadcasts } from '@/domains/broadcasts/repository';
import { listConnectedPatients } from '@/domains/patients/repository';
import { BroadcastComposeForm } from '@/components/features/broadcast-compose-form';
import { canWriteOrg } from '@/constants/roles';
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

export default async function BroadcastsPage() {
  const session = await requireProviderSession();
  const orgId = session.activeOrganizationId;
  const [broadcasts, { rows: patients }] = await Promise.all([
    listBroadcasts(orgId),
    listConnectedPatients(orgId, { limit: 200 }),
  ]);
  const canWrite = canWriteOrg(session.activeRole);

  const patientOptions = patients.map((p) => ({
    id: p.connection.patient_id,
    label: `${p.profile?.full_name ?? 'Unknown'} (${p.profile?.patient_id ?? '—'})`,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">Broadcasts</h1>
        <p className="mt-1 text-sm text-muted">
          Announcements to connected patients (OS push delivery is future work)
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {canWrite && (
          <Card>
            <CardHeader>
              <CardTitle>Compose</CardTitle>
              <CardDescription>Creates recipients and activity timeline entries</CardDescription>
            </CardHeader>
            <CardContent>
              <BroadcastComposeForm patients={patientOptions} />
            </CardContent>
          </Card>
        )}

        <Card className={canWrite ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <CardHeader>
            <CardTitle>Sent & drafts</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {broadcasts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted">
                      No broadcasts yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  broadcasts.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <p className="font-medium">{b.title}</p>
                        <p className="line-clamp-1 text-xs text-muted">{b.message}</p>
                      </TableCell>
                      <TableCell>{b.audience}</TableCell>
                      <TableCell>
                        <Badge variant={b.status === 'sent' ? 'success' : 'secondary'}>
                          {b.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {b.sent_at ? format(new Date(b.sent_at), 'MMM d, yyyy HH:mm') : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
