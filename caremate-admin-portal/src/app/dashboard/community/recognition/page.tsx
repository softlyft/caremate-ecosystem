import { listBadges, listBadgesPage, listCertificates, listCertificatesPage } from '@/domains/community/repository';
import { AwardBadgeForm } from '@/features/community/award-badge-form';
import { CreateBadgeForm } from '@/features/community/create-badge-form';
import { emptyPage, parsePage, type PaginatedResult } from '@/lib/pagination';
import { PageHeader } from '@/components/page-header';
import { PaginationBar } from '@/components/pagination-bar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CommunityBadge, CommunityCertificate } from '@/types/community';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function recognitionHref(opts: { badgesPage?: number; certsPage?: number }): string {
  const params = new URLSearchParams();
  if (opts.badgesPage && opts.badgesPage > 1) params.set('badgesPage', String(opts.badgesPage));
  if (opts.certsPage && opts.certsPage > 1) params.set('certsPage', String(opts.certsPage));
  const qs = params.toString();
  return `/dashboard/community/recognition${qs ? `?${qs}` : ''}`;
}

export default async function CommunityRecognitionPage({
  searchParams,
}: {
  searchParams: Promise<{ badgesPage?: string; certsPage?: string }>;
}) {
  const { badgesPage: badgesPageParam, certsPage: certsPageParam } = await searchParams;
  const badgesPage = parsePage(badgesPageParam);
  const certsPage = parsePage(certsPageParam);

  let badgesResult: PaginatedResult<CommunityBadge> = emptyPage(badgesPage);
  let certsResult: PaginatedResult<CommunityCertificate> = emptyPage(certsPage);
  let allBadges: Awaited<ReturnType<typeof listBadges>> = [];
  let allCertificates: Awaited<ReturnType<typeof listCertificates>> = [];
  try {
    [badgesResult, certsResult, allBadges, allCertificates] = await Promise.all([
      listBadgesPage({ page: badgesPage }),
      listCertificatesPage({ page: certsPage }),
      listBadges(),
      listCertificates(),
    ]);
  } catch {
    badgesResult = emptyPage(badgesPage);
    certsResult = emptyPage(certsPage);
    allBadges = [];
    allCertificates = [];
  }

  const hrefForBadgesPage = (nextPage: number) =>
    recognitionHref({ badgesPage: nextPage, certsPage });
  const hrefForCertsPage = (nextPage: number) =>
    recognitionHref({ badgesPage, certsPage: nextPage });

  return (
    <div>
      <PageHeader
        title="Recognition"
        description="Badge and certificate catalog, plus manual awards."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <CreateBadgeForm />
        <AwardBadgeForm badges={allBadges} certificates={allCertificates} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Badges</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {badgesResult.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted">
                      No badges yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  badgesResult.rows.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <div className="font-medium">{b.name}</div>
                        <div className="text-xs text-muted">{b.slug}</div>
                      </TableCell>
                      <TableCell>{b.points_value}</TableCell>
                      <TableCell>
                        {b.is_active ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <PaginationBar result={badgesResult} hrefForPage={hrefForBadgesPage} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Certificates</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certsResult.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted">
                      No certificates yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  certsResult.rows.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted">{c.slug}</TableCell>
                      <TableCell>
                        {c.is_active ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <PaginationBar result={certsResult} hrefForPage={hrefForCertsPage} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
