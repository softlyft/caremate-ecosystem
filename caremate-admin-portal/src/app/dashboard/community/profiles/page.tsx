import { formatDistanceToNow } from 'date-fns';
import { listProfilesPage } from '@/domains/community/repository';
import { emptyPage, parsePage, type PaginatedResult } from '@/lib/pagination';
import { PageHeader } from '@/components/page-header';
import { PaginationBar } from '@/components/pagination-bar';
import { Card, CardContent } from '@/components/ui/card';
import type { CommunityProfile } from '@/types/community';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function profilesHref(page?: number): string {
  const params = new URLSearchParams();
  if (page && page > 1) params.set('page', String(page));
  const qs = params.toString();
  return `/dashboard/community/profiles${qs ? `?${qs}` : ''}`;
}

export default async function CommunityProfilesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  let profiles: PaginatedResult<CommunityProfile> = emptyPage(page);
  try {
    profiles = await listProfilesPage({ page });
  } catch {
    profiles = emptyPage(page);
  }

  const hrefForPage = (nextPage: number) => profilesHref(nextPage);

  return (
    <div>
      <PageHeader
        title="Community members"
        description="Community memberships linked to canonical CareMate app profiles."
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Patient ID</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Registered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted">
                    No community members found.
                  </TableCell>
                </TableRow>
              ) : (
                profiles.rows.map((p) => (
                  <TableRow key={p.user_id}>
                    <TableCell className="font-medium">{p.full_name}</TableCell>
                    <TableCell className="font-mono text-muted">{p.patient_id ?? '—'}</TableCell>
                    <TableCell className="text-muted">{p.email ?? '—'}</TableCell>
                    <TableCell className="text-muted">{p.phone ?? '—'}</TableCell>
                    <TableCell className="text-muted">{p.country_code ?? '—'}</TableCell>
                    <TableCell className="text-muted">
                      {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <PaginationBar result={profiles} hrefForPage={hrefForPage} />
        </CardContent>
      </Card>
    </div>
  );
}
