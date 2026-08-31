import { format } from 'date-fns';
import { PaginationBar } from '@/components/pagination-bar';
import { PageHeader, PageShell } from '@/components/page-header';
import { SearchForm } from '@/components/search-form';
import { OrgConnectionActions } from '@/components/features/org-connection-actions';
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

export type ConnectedOrgRow = {
  id: string;
  name: string;
  claimEmail: string;
  phone: string | null;
  status: string;
  approved_at: string | null;
};

export function ConnectedOrgsPanel({
  title,
  tableTitle,
  total,
  rows,
  result,
  query,
  hrefForPage,
  searchPlaceholder,
  canWrite,
  connectionSide,
  emptyMessage,
  entityNameHeader,
  showPhoneColumn = false,
}: {
  title: string;
  tableTitle: string;
  total: number;
  rows: ConnectedOrgRow[];
  result: PaginatedResult<ConnectedOrgRow>;
  query: string;
  hrefForPage: (page: number) => string;
  searchPlaceholder: string;
  canWrite: boolean;
  connectionSide: 'provider' | 'payer';
  emptyMessage: string;
  entityNameHeader: string;
  showPhoneColumn?: boolean;
}) {
  const colSpan = showPhoneColumn ? 6 : 5;

  return (
    <PageShell>
      <PageHeader
        title={title}
        description={`${total} approved connections`}
        actions={<SearchForm placeholder={searchPlaceholder} defaultValue={query} />}
      />

      <Card>
        <CardHeader>
          <CardTitle>{tableTitle}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{entityNameHeader}</TableHead>
                <TableHead>Claim email</TableHead>
                {showPhoneColumn ? <TableHead>Phone</TableHead> : null}
                <TableHead>Status</TableHead>
                <TableHead>Connected since</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className="text-center text-muted">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.claimEmail}</TableCell>
                    {showPhoneColumn ? <TableCell>{r.phone ?? '—'}</TableCell> : null}
                    <TableCell>
                      <Badge variant="success">{r.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {r.approved_at ? format(new Date(r.approved_at), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    <TableCell>
                      {canWrite ? (
                        <OrgConnectionActions
                          connectionId={r.id}
                          side={connectionSide}
                          mode="approved"
                        />
                      ) : null}
                    </TableCell>
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
