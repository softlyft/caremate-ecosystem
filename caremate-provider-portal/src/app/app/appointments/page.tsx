import { format } from 'date-fns';
import { requireProviderSession } from '@/lib/auth';
import { listAppointments } from '@/domains/appointments/repository';
import { hrefWithPage, parsePage } from '@/lib/pagination';
import { PaginationBar } from '@/components/pagination-bar';
import { AppointmentActions } from '@/components/features/appointment-actions';
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

const STATUS_VARIANT: Record<string, 'default' | 'warning' | 'success' | 'danger' | 'secondary'> = {
  pending: 'warning',
  confirmed: 'success',
  rejected: 'danger',
  completed: 'secondary',
  rescheduled: 'default',
};

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requireProviderSession();
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const result = await listAppointments(session.activeOrganizationId, { page });
  const canWrite = canWriteOrg(session.activeRole);

  const hrefForPage = (p: number) => hrefWithPage('/app/appointments', p);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">Appointments</h1>
        <p className="mt-1 text-sm text-muted">
          Patient appointment requests — no calendar sync (MVP)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted">
                    No appointment requests.
                  </TableCell>
                </TableRow>
              ) : (
                result.rows.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      {a.profile?.full_name ?? 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(a.requested_date), 'MMM d, yyyy')}
                      {a.rescheduled_date
                        ? ` → ${format(new Date(a.rescheduled_date), 'MMM d, yyyy')}`
                        : ''}
                    </TableCell>
                    <TableCell>{a.requested_time ?? '—'}</TableCell>
                    <TableCell className="max-w-xs truncate">{a.notes ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[a.status] ?? 'secondary'}>{a.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {canWrite && result.rows.length > 0 && (
            <div className="space-y-4 border-t border-border p-4">
              <p className="text-sm font-medium">Update request</p>
              {result.rows
                .filter((a) => a.status === 'pending' || a.status === 'confirmed')
                .map((a) => (
                  <div key={a.id} className="rounded-lg border border-border p-3">
                    <p className="mb-2 text-sm text-muted">
                      {a.profile?.full_name ?? 'Patient'} · {a.requested_date}
                    </p>
                    <AppointmentActions appointmentId={a.id} currentStatus={a.status} />
                  </div>
                ))}
            </div>
          )}

          <PaginationBar result={result} hrefForPage={hrefForPage} />
        </CardContent>
      </Card>
    </div>
  );
}
