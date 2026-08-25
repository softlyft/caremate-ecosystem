import { format } from 'date-fns';
import { requireProviderSession } from '@/lib/auth';
import { requireModule } from '@/domains/modules/guard';
import { listProviderPayerConnectionsByStatus } from '@/domains/payer-connections/repository';
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

export default async function ConnectedPayersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireModule('payers');
  const session = await requireProviderSession();
  const { q, page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const result = await listProviderPayerConnectionsByStatus(
    session.activeOrganizationId,
    'approved',
    { page },
  );

  const query = (q ?? '').trim().toLowerCase();
  const rows = query
    ? result.rows.filter((r) => {
        const name = r.payer?.name?.toLowerCase() ?? '';
        const email = r.payer?.email?.toLowerCase() ?? '';
        return name.includes(query) || email.includes(query);
      })
    : result.rows;

  const hrefForPage = (p: number) => hrefWithPage('/app/payers', p, { q });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
            Connected payers
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
          <CardTitle>Payers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payer name</TableHead>
                <TableHead>Claim email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Connected since</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted">
                    No connected payers yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.payer?.name ?? 'Unknown'}</TableCell>
                    <TableCell>{r.payer?.email ?? '—'}</TableCell>
                    <TableCell>{r.payer?.phone ?? '—'}</TableCell>
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
