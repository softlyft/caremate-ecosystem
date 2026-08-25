import { format } from 'date-fns';
import { requirePayerSession } from '@/lib/auth';
import { listPayerProviderConnectionsByStatus } from '@/domains/payer-connections/repository';
import { hrefWithPage, parsePage } from '@/lib/pagination';
import { PaginationBar } from '@/components/pagination-bar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function ConnectedProvidersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await requirePayerSession();
  const { q, page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const result = await listPayerProviderConnectionsByStatus(
    session.activeOrganizationId,
    'approved',
    { page },
  );

  const query = (q ?? '').trim().toLowerCase();
  const rows = query
    ? result.rows.filter((r) => {
        const name = r.provider?.name?.toLowerCase() ?? '';
        const email = r.providerClaimEmail?.toLowerCase() ?? '';
        return name.includes(query) || email.includes(query);
      })
    : result.rows;

  const hrefForPage = (p: number) => hrefWithPage('/payer/providers', p, { q });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
            Connected providers
          </h1>
          <p className="mt-1 text-sm text-muted">{result.total} approved connections</p>
        </div>
        <form className="flex gap-2">
          <Input
            name="q"
            placeholder="Search name or claim email"
            defaultValue={q ?? ''}
            className="w-72"
          />
          <button
            type="submit"
            className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-dark"
          >
            Search
          </button>
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Providers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider name</TableHead>
                <TableHead>Claim email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Connected since</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted">
                    No connected providers yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.provider?.name ?? 'Unknown'}
                    </TableCell>
                    <TableCell>{r.providerClaimEmail ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="success">{r.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {r.approved_at ? format(new Date(r.approved_at), 'MMM d, yyyy') : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {!query ? <PaginationBar result={result} hrefForPage={hrefForPage} /> : null}
        </CardContent>
      </Card>
    </div>
  );
}
