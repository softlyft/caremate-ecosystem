import { TextLink } from '@/components/ui/text-link';
import { format } from 'date-fns';
import { PaginationBar } from '@/components/pagination-bar';
import { PageHeader, PageShell } from '@/components/page-header';
import { SearchForm } from '@/components/search-form';
import { ConnectionActions } from '@/components/features/connection-actions';
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

export type ConnectedPatientListRow = {
  connectionId: string;
  patientUserId: string;
  profile: {
    full_name: string | null;
    patient_id: string | null;
    phone: string | null;
  } | null;
  status: string;
  approved_at: string | null;
  isStaff: boolean;
  lastActivityAt: string | null;
};

export function ConnectedPatientsPanel({
  detailPathPrefix,
  canWrite,
  query,
  result,
  rows,
  hrefForPage,
  connectionHandlers,
  connectionErrorMapper = 'provider-patient',
  showStaffColumn = false,
  showLastActivityColumn = false,
}: {
  detailPathPrefix: string;
  canWrite: boolean;
  query: string;
  result: PaginatedResult<ConnectedPatientListRow>;
  rows: ConnectedPatientListRow[];
  hrefForPage: (page: number) => string;
  connectionHandlers?: ConnectionActionHandlers;
  connectionErrorMapper?: ConnectionErrorMapper;
  showStaffColumn?: boolean;
  showLastActivityColumn?: boolean;
}) {
  const showActions = Boolean(connectionHandlers);
  const colSpan =
    5 + (showStaffColumn ? 1 : 0) + (showLastActivityColumn ? 1 : 0) + (showActions ? 1 : 0);

  return (
    <PageShell>
      <PageHeader
        title="Connected patients"
        description={`${result.total} approved connections`}
        actions={
          <SearchForm
            placeholder="Search name, CareMate ID, phone"
            defaultValue={query}
          />
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Patients</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient name</TableHead>
                <TableHead>CareMate ID</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                {showStaffColumn ? <TableHead>Staff</TableHead> : null}
                <TableHead>Connected since</TableHead>
                {showLastActivityColumn ? <TableHead>Last activity</TableHead> : null}
                {showActions ? <TableHead /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className="text-center text-muted">
                    No connected patients yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.connectionId}>
                    <TableCell>
                      <TextLink href={`${detailPathPrefix}/${r.patientUserId}`}>
                        {r.profile?.full_name ?? 'Unknown'}
                      </TextLink>
                    </TableCell>
                    <TableCell>{r.profile?.patient_id ?? '—'}</TableCell>
                    <TableCell>{r.profile?.phone ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="success">{r.status}</Badge>
                    </TableCell>
                    {showStaffColumn ? (
                      <TableCell>
                        {r.isStaff ? (
                          <Badge variant="default">Staff</Badge>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </TableCell>
                    ) : null}
                    <TableCell>
                      {r.approved_at ? format(new Date(r.approved_at), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    {showLastActivityColumn ? (
                      <TableCell>
                        {r.lastActivityAt
                          ? format(new Date(r.lastActivityAt), 'MMM d, yyyy')
                          : '—'}
                      </TableCell>
                    ) : null}
                    {showActions && connectionHandlers ? (
                      <TableCell>
                        {canWrite ? (
                          <ConnectionActions
                            connectionId={r.connectionId}
                            mode="approved"
                            handlers={connectionHandlers}
                            errorMapper={connectionErrorMapper}
                          />
                        ) : null}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <PaginationBar result={result} hrefForPage={hrefForPage} />
        </CardContent>
      </Card>
    </PageShell>
  );
}
