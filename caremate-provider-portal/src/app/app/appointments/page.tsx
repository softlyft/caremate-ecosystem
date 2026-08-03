import Link from 'next/link';
import { format } from 'date-fns';
import { requireProviderSession } from '@/lib/auth';
import { requireModule } from '@/domains/modules/guard';
import {
  listAppointments,
  listAvailability,
} from '@/domains/appointments/repository';
import { listConnectionsByStatus } from '@/domains/connections/repository';
import { hrefWithPage, parsePage } from '@/lib/pagination';
import { PaginationBar } from '@/components/pagination-bar';
import { AppointmentActions } from '@/components/features/appointment-actions';
import { ScheduleAppointmentForm } from '@/components/features/schedule-appointment-form';
import { AvailabilityManager } from '@/components/features/availability-manager';
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
import { cn } from '@/lib/utils';

const STATUS_VARIANT: Record<string, 'default' | 'warning' | 'success' | 'danger' | 'secondary'> = {
  pending: 'warning',
  confirmed: 'success',
  checked_in: 'default',
  rejected: 'danger',
  cancelled: 'danger',
  completed: 'secondary',
  rescheduled: 'default',
};

const TABS = [
  { id: 'schedule', label: 'Schedule' },
  { id: 'requests', label: 'Requests' },
  { id: 'availability', label: 'Availability' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string }>;
}) {
  await requireModule('appointments');
  const session = await requireProviderSession();
  const { page: pageParam, tab: tabParam } = await searchParams;
  const tab = (TABS.some((t) => t.id === tabParam) ? tabParam : 'schedule') as TabId;
  const page = parsePage(pageParam);
  const canWrite = canWriteOrg(session.activeRole);

  const [schedule, requests, availability, connected] = await Promise.all([
    listAppointments(session.activeOrganizationId, {
      page: tab === 'schedule' ? page : 1,
      pageSize: tab === 'schedule' ? undefined : 5,
    }),
    listAppointments(session.activeOrganizationId, {
      source: 'patient_request',
      page: tab === 'requests' ? page : 1,
    }),
    listAvailability(session.activeOrganizationId),
    listConnectionsByStatus(session.activeOrganizationId, 'approved', { pageSize: 100 }),
  ]);

  const patients = connected.rows.map((c) => ({
    userId: c.patient_id,
    label: `${c.profile?.full_name ?? 'Patient'}${
      c.profile?.patient_id ? ` · ${c.profile.patient_id}` : ''
    }`,
  }));

  const hrefForPage = (p: number) => hrefWithPage('/app/appointments', p, { tab });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">Appointments</h1>
        <p className="mt-1 text-sm text-muted">
          Set availability, schedule visits for connected patients, and work the request queue.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/app/appointments?tab=${t.id}`}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium',
              tab === t.id
                ? 'bg-primary-light text-primary-dark'
                : 'text-muted hover:bg-surface-muted',
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === 'schedule' ? (
        <>
          {canWrite ? (
            <Card>
              <CardHeader>
                <CardTitle>Schedule an appointment</CardTitle>
                <CardDescription>
                  Creates a confirmed visit for a connected patient (portal-only for now).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScheduleAppointmentForm patients={patients} />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Upcoming &amp; recent</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-0">
              <AppointmentTable rows={schedule.rows} />
              {canWrite &&
                schedule.rows
                  .filter((a) =>
                    ['pending', 'confirmed', 'checked_in', 'rescheduled'].includes(a.status),
                  )
                  .map((a) => (
                    <div key={a.id} className="border-t border-border p-4">
                      <p className="mb-2 text-sm text-muted">
                        {a.profile?.full_name ?? 'Patient'} · {a.requested_date}
                      </p>
                      <AppointmentActions appointmentId={a.id} currentStatus={a.status} />
                    </div>
                  ))}
              <PaginationBar result={schedule} hrefForPage={hrefForPage} />
            </CardContent>
          </Card>
        </>
      ) : null}

      {tab === 'requests' ? (
        <Card>
          <CardHeader>
            <CardTitle>Patient requests</CardTitle>
            <CardDescription>
              Inbound requests from patients. Mobile booking will populate this queue later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-0">
            <AppointmentTable rows={requests.rows} />
            {canWrite &&
              requests.rows
                .filter((a) => a.status === 'pending' || a.status === 'confirmed')
                .map((a) => (
                  <div key={a.id} className="border-t border-border p-4">
                    <p className="mb-2 text-sm text-muted">
                      {a.profile?.full_name ?? 'Patient'} · {a.requested_date}
                    </p>
                    <AppointmentActions appointmentId={a.id} currentStatus={a.status} />
                  </div>
                ))}
            <PaginationBar result={requests} hrefForPage={hrefForPage} />
          </CardContent>
        </Card>
      ) : null}

      {tab === 'availability' ? (
        <Card>
          <CardHeader>
            <CardTitle>Weekly availability</CardTitle>
            <CardDescription>
              Windows staff use when scheduling. Not synced to an external calendar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AvailabilityManager rows={availability} canWrite={canWrite} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function AppointmentTable({
  rows,
}: {
  rows: Awaited<ReturnType<typeof listAppointments>>['rows'];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Patient</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Time</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted">
              No appointments.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-medium">{a.profile?.full_name ?? 'Unknown'}</TableCell>
              <TableCell>
                {format(new Date(a.requested_date), 'MMM d, yyyy')}
                {a.rescheduled_date
                  ? ` → ${format(new Date(a.rescheduled_date), 'MMM d, yyyy')}`
                  : ''}
              </TableCell>
              <TableCell>{a.requested_time ?? a.rescheduled_time ?? '—'}</TableCell>
              <TableCell className="text-muted">
                {a.source === 'provider_scheduled' ? 'Staff' : 'Patient'}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[a.status] ?? 'secondary'}>{a.status}</Badge>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
