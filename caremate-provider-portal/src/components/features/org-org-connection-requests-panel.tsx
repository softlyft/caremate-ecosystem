import type { ReactNode } from 'react';
import { PageHeader, PageShell } from '@/components/page-header';
import { format } from 'date-fns';
import { PaginationBar } from '@/components/pagination-bar';
import { OrgConnectionActions } from '@/components/features/org-connection-actions';
import {
  OrgPlanUsageBanner,
  type OrgPlanLimitRow,
} from '@/components/features/org-plan-usage-banner';
import type { PaginatedResult } from '@/lib/pagination';
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

export type OrgOrgConnectionRequestRow = {
  id: string;
  orgName: string;
  claimEmail: string;
  phone: string | null;
  inboundNote: string | null;
  outboundNote: string | null;
  created_at: string;
  status: string;
};

export function OrgOrgConnectionRequestsPanel({
  title,
  description,
  entityLabel,
  canWrite,
  requestForm,
  requestFormDescription,
  inbound,
  outbound,
  hrefForInboundPage,
  hrefForOutboundPage,
  connectionSide,
  showPhoneColumn = false,
  emptyInboundMessage,
  emptyOutboundMessage,
  awaitingOutboundLabel,
  planUsageRows,
  canApprovePartners = true,
  canRequestPartners = true,
  upgradeHref,
}: {
  title: string;
  description: string;
  entityLabel: string;
  canWrite: boolean;
  requestForm: ReactNode;
  requestFormDescription: string;
  inbound: PaginatedResult<OrgOrgConnectionRequestRow>;
  outbound: PaginatedResult<OrgOrgConnectionRequestRow>;
  hrefForInboundPage: (page: number) => string;
  hrefForOutboundPage: (page: number) => string;
  connectionSide: 'provider' | 'payer';
  showPhoneColumn?: boolean;
  emptyInboundMessage: string;
  emptyOutboundMessage: string;
  awaitingOutboundLabel: string;
  planUsageRows?: OrgPlanLimitRow[];
  canApprovePartners?: boolean;
  canRequestPartners?: boolean;
  upgradeHref?: string;
}) {
  const colSpan = showPhoneColumn ? 7 : 6;

  return (
    <PageShell>
      <PageHeader title={title} description={description} />

      {planUsageRows?.length ? (
        <OrgPlanUsageBanner rows={planUsageRows} upgradeHref={upgradeHref} />
      ) : null}

      {canWrite ? (
        <Card>
          <CardHeader>
            <CardTitle>Request a connection</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted">{requestFormDescription}</p>
            {!canRequestPartners ? (
              <p className="text-sm text-orange-800">
                {entityLabel} connection limit reached on your current plan.
              </p>
            ) : (
              requestForm
            )}
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
                <TableHead>{entityLabel}</TableHead>
                <TableHead>Claim email</TableHead>
                {showPhoneColumn ? <TableHead>Phone</TableHead> : null}
                <TableHead>Note</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {inbound.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className="text-center text-muted">
                    {emptyInboundMessage}
                  </TableCell>
                </TableRow>
              ) : (
                inbound.rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.orgName}</TableCell>
                    <TableCell>{r.claimEmail}</TableCell>
                    {showPhoneColumn ? <TableCell>{r.phone ?? '—'}</TableCell> : null}
                    <TableCell className="max-w-xs truncate">{r.inboundNote ?? '—'}</TableCell>
                    <TableCell>{format(new Date(r.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <Badge variant="warning">{r.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {canWrite ? (
                        <OrgConnectionActions
                          connectionId={r.id}
                          side={connectionSide}
                          mode="inbound-pending"
                          approveDisabled={!canApprovePartners}
                        />
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
          <CardTitle>
            {awaitingOutboundLabel} ({outbound.total})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{entityLabel}</TableHead>
                <TableHead>Claim email</TableHead>
                {showPhoneColumn ? <TableHead>Phone</TableHead> : null}
                <TableHead>Your note</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {outbound.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className="text-center text-muted">
                    {emptyOutboundMessage}
                  </TableCell>
                </TableRow>
              ) : (
                outbound.rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.orgName}</TableCell>
                    <TableCell>{r.claimEmail}</TableCell>
                    {showPhoneColumn ? <TableCell>{r.phone ?? '—'}</TableCell> : null}
                    <TableCell className="max-w-xs truncate">{r.outboundNote ?? '—'}</TableCell>
                    <TableCell>{format(new Date(r.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <Badge variant="warning">{awaitingOutboundLabel.toLowerCase()}</Badge>
                    </TableCell>
                    <TableCell>
                      {canWrite ? (
                        <OrgConnectionActions
                          connectionId={r.id}
                          side={connectionSide}
                          mode="outbound-pending"
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
    </PageShell>
  );
}
