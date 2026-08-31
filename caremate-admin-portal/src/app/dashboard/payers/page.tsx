import { listPayerOrganizations } from '@/domains/payers/repository';
import { getPortalSession } from '@/lib/auth';
import { canEditCatalog } from '@/constants/roles';
import { emptyPage, parsePage, type PaginatedResult } from '@/lib/pagination';
import { PageHeader } from '@/components/page-header';
import { PaginationBar } from '@/components/pagination-bar';
import { SearchForm } from '@/components/search-form';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button-link';
import { Card, CardContent } from '@/components/ui/card';
import { TextLink } from '@/components/ui/text-link';
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
          <ButtonLink href="/dashboard/payers/new" size="sm">
            Create organization
          </ButtonLink>
        ) : null}
      </PageHeader>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <SearchForm
            placeholder="Search by name or email…"
            defaultValue={q ?? ''}
            submitLabel="Search"
          />

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
                      <TextLink href={`/dashboard/payers/${org.id}`}>{org.name}</TextLink>
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
