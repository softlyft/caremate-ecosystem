import { format } from 'date-fns';
import { requireProviderSession } from '@/lib/auth';
import { requireModule } from '@/domains/modules/guard';
import { listConnectionsByStatus } from '@/domains/connections/repository';
import { parsePage } from '@/lib/pagination';
import { PaginationBar } from '@/components/pagination-bar';
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

function requestsHref(opts: { page?: number; outboundPage?: number }): string {
  const params = new URLSearchParams();
  if (opts.page && opts.page > 1) params.set('page', String(opts.page));
  if (opts.outboundPage && opts.outboundPage > 1) {
    params.set('outboundPage', String(opts.outboundPage));
  }
  const qs = params.toString();
  return qs ? `/app/patients/requests?${qs}` : '/app/patients/requests';
}

export default async function ConnectionRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; outboundPage?: string }>;
}) {
  await requireModule('patients');
  const session = await requireProviderSession();
  const { page: pageParam, outboundPage: outboundPageParam } = await searchParams;
  const page = parsePage(pageParam);
  const outboundPage = parsePage(outboundPageParam);

  const [inbound, outbound] = await Promise.all([
    listConnectionsByStatus(session.activeOrganizationId, 'pending', {
      page,
      initiatedBy: 'patient',
    }),
    listConnectionsByStatus(session.activeOrganizationId, 'pending', {
      page: outboundPage,
      initiatedBy: 'provider',
    }),
  ]);
  const canWrite = canWriteOrg(session.activeRole);

  const hrefForInboundPage = (p: number) =>
    requestsHref({ page: p, outboundPage: outboundPage > 1 ? outboundPage : undefined });
  const hrefForOutboundPage = (p: number) =>
    requestsHref({ page: page > 1 ? page : undefined, outboundPage: p });

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
          <CardTitle>Awaiting your review ({inbound.total})</CardTitle>
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
              {inbound.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted">
                    No patient requests waiting for approval.
                  </TableCell>
                </TableRow>
              ) : (
                inbound.rows.map((r) => (
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
                      {canWrite ? <ConnectionActions connectionId={r.id} mode="inbound-pending" /> : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <PaginationBar result={inbound} hrefForPage={hrefForInboundPage} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Awaiting patient ({outbound.total})</CardTitle>
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
              {outbound.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted">
                    No outbound requests waiting on patients.
                  </TableCell>
                </TableRow>
              ) : (
                outbound.rows.map((r) => (
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
                        <ConnectionActions connectionId={r.id} mode="outbound-pending" />
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <PaginationBar result={outbound} hrefForPage={hrefForOutboundPage} />
        </CardContent>
      </Card>
    </div>
  );
}
