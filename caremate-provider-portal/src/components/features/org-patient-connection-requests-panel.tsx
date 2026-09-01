import { format } from 'date-fns';
import type { ReactNode } from 'react';
import { PaginationBar } from '@/components/pagination-bar';
import { PageHeader, PageShell } from '@/components/page-header';
import { ConnectionActions } from '@/components/features/connection-actions';
import {
  OrgPlanUsageBanner,
  type OrgPlanLimitRow,
} from '@/components/features/org-plan-usage-banner';
import type { ConnectionActionHandlers } from '@/lib/connection-action-handlers';
import type { ConnectionErrorMapper } from '@/lib/connection-error-format';
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

export type PatientConnectionRequestRow = {
  id: string;
  profile: {
    full_name: string | null;
    patient_id: string | null;
    phone: string | null;
  } | null;
  patient_note: string | null;
  outbound_note: string | null;
  created_at: string;
  status: string;
};

export function OrgPatientConnectionRequestsPanel({
  title,
  description,
  canWrite,
  requestForm,
  inbound,
  outbound,
  hrefForInboundPage,
  hrefForOutboundPage,
  handlers,
  errorMapper = 'provider-patient',
  planUsageRows,
  canApprovePatients = true,
  canRequestPatients = true,
  upgradeHref,
}: {
  title: string;
  description: string;
  canWrite: boolean;
  requestForm: ReactNode;
  inbound: PaginatedResult<PatientConnectionRequestRow>;
  outbound: PaginatedResult<PatientConnectionRequestRow>;
  hrefForInboundPage: (page: number) => string;
  hrefForOutboundPage: (page: number) => string;
  handlers: ConnectionActionHandlers;
  errorMapper?: ConnectionErrorMapper;
  planUsageRows?: OrgPlanLimitRow[];
  canApprovePatients?: boolean;
  canRequestPatients?: boolean;
  upgradeHref?: string;
}) {
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
            <p className="mb-4 text-sm text-muted">
              Enter the patient&apos;s 12-digit CareMate ID. No clinical data is shared — this only
              creates a connection record. The patient must approve in the CareMate app.
            </p>
            {!canRequestPatients ? (
              <p className="text-sm text-orange-800">
                Patient connection limit reached on your current plan.
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
                    <TableCell className="max-w-xs truncate">{r.patient_note ?? '—'}</TableCell>
                    <TableCell>{format(new Date(r.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <Badge variant="warning">{r.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {canWrite ? (
                        <ConnectionActions
                          connectionId={r.id}
                          mode="inbound-pending"
                          handlers={handlers}
                          errorMapper={errorMapper}
                          approveDisabled={!canApprovePatients}
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
                    <TableCell className="max-w-xs truncate">{r.outbound_note ?? '—'}</TableCell>
                    <TableCell>{format(new Date(r.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <Badge variant="warning">awaiting patient</Badge>
                    </TableCell>
                    <TableCell>
                      {canWrite ? (
                        <ConnectionActions
                          connectionId={r.id}
                          mode="outbound-pending"
                          handlers={handlers}
                          errorMapper={errorMapper}
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
