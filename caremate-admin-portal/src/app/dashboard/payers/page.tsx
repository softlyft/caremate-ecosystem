import Link from 'next/link';
import { listPayerOrganizations } from '@/domains/payers/repository';
import { getPortalSession } from '@/lib/auth';
import { canEditCatalog } from '@/constants/roles';
import { emptyPage, parsePage, type PaginatedResult } from '@/lib/pagination';
import { PageHeader } from '@/components/page-header';
import { PaginationBar } from '@/components/pagination-bar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { PayerOrganization } from '@/types/database';

function payersHref(opts: { q?: string; page?: number }): string {
  const params = new URLSearchParams();
  if (opts.q?.trim()) params.set('q', opts.q.trim());
  if (opts.page && opts.page > 1) params.set('page', String(opts.page));
  const qs = params.toString();
  return `/dashboard/payers${qs ? `?${qs}` : ''}`;
}

export default async function PayersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await getPortalSession();
  const canEdit = canEditCatalog(session?.role);
  const { q, page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  let result: PaginatedResult<PayerOrganization> = emptyPage(page);
  try {
    result = await listPayerOrganizations({ search: q, page });
  } catch {
    result = emptyPage(page);
  }

  const hrefForPage = (nextPage: number) => payersHref({ q, page: nextPage });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Health Insurance"
        description="Payer catalog for Care Portal claim (insurers, HMOs, and other payers)."
      >
        {canEdit ? (
          <Link
            href="/dashboard/payers/new"
            className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-medium text-white hover:bg-primary-dark"
          >
            Create organization
          </Link>
        ) : null}
      </PageHeader>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <form className="flex flex-wrap gap-2" method="get">
            <Input
              name="q"
              defaultValue={q ?? ''}
              placeholder="Search by name or email…"
              className="max-w-sm"
            />
            <button
              type="submit"
              className="inline-flex h-10 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-surface-muted"
            >
              Search
            </button>
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Claim email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted">
                    No health insurance organizations found.
                  </TableCell>
                </TableRow>
              ) : (
                result.rows.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/payers/${org.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {org.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted">{org.email ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted">{org.phone ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={org.active ? 'success' : 'secondary'}>
                        {org.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <PaginationBar result={result} hrefForPage={hrefForPage} />
        </CardContent>
      </Card>
    </div>
  );
}
