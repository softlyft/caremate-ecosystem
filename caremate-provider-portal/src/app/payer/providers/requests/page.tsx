import { format } from 'date-fns';
import { requirePayerSession } from '@/lib/auth';
import { listPayerProviderConnectionsByStatus } from '@/domains/payer-connections/repository';
import { parsePage } from '@/lib/pagination';
import { PaginationBar } from '@/components/pagination-bar';
import { PayerConnectionActions } from '@/components/features/payer-connection-actions';
import { RequestProviderConnectionForm } from '@/components/features/request-provider-connection-form';
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
  return qs ? `/payer/providers/requests?${qs}` : '/payer/providers/requests';
}

export default async function ProviderConnectionRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; outboundPage?: string }>;
}) {
  const session = await requirePayerSession();
  const { page: pageParam, outboundPage: outboundPageParam } = await searchParams;
  const page = parsePage(pageParam);
  const outboundPage = parsePage(outboundPageParam);

  const [inbound, outbound] = await Promise.all([
    listPayerProviderConnectionsByStatus(session.activeOrganizationId, 'pending', {
      page,
      initiatedBy: 'provider',
    }),
    listPayerProviderConnectionsByStatus(session.activeOrganizationId, 'pending', {
      page: outboundPage,
      initiatedBy: 'payer',
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
          Provider connection requests
        </h1>
        <p className="mt-1 text-sm text-muted">
          Request a connection with a verified provider organization, or approve providers who want
          to connect
        </p>
      </div>

      {canWrite ? (
        <Card>
          <CardHeader>
            <CardTitle>Request a connection</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted">
              Enter the provider&apos;s claim/verification contact email. Both organizations must be
              verified. The provider must approve in Care Portal.
            </p>
            <RequestProviderConnectionForm />
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
                <TableHead>Provider</TableHead>
                <TableHead>Claim email</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {inbound.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted">
                    No provider requests waiting for approval.
                  </TableCell>
                </TableRow>
              ) : (
                inbound.rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.provider?.name ?? 'Unknown'}
                    </TableCell>
                    <TableCell>{r.providerClaimEmail ?? '—'}</TableCell>
                    <TableCell className="max-w-xs truncate">{r.provider_note ?? '—'}</TableCell>
                    <TableCell>{format(new Date(r.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <Badge variant="warning">{r.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {canWrite ? (
                        <PayerConnectionActions connectionId={r.id} side="payer" />
                      ) : null}
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
          <CardTitle>Awaiting provider ({outbound.total})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Claim email</TableHead>
                <TableHead>Your note</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {outbound.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted">
                    No outbound requests waiting on providers.
                  </TableCell>
                </TableRow>
              ) : (
                outbound.rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.provider?.name ?? 'Unknown'}
                    </TableCell>
                    <TableCell>{r.providerClaimEmail ?? '—'}</TableCell>
                    <TableCell className="max-w-xs truncate">{r.payer_note ?? '—'}</TableCell>
                    <TableCell>{format(new Date(r.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <Badge variant="warning">awaiting provider</Badge>
                    </TableCell>
                    <TableCell>
                      {canWrite ? (
                        <PayerConnectionActions
                          connectionId={r.id}
                          side="payer"
                          showApprove={false}
                        />
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
