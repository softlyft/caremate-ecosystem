import { listBadges, listCertificates } from '@/domains/community/repository';
import { AwardBadgeForm } from '@/features/community/award-badge-form';
import { CreateBadgeForm } from '@/features/community/create-badge-form';
import { PageHeader } from '@/components/page-header';
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

export default async function CommunityRecognitionPage() {
  let badges: Awaited<ReturnType<typeof listBadges>> = [];
  let certificates: Awaited<ReturnType<typeof listCertificates>> = [];
  try {
    [badges, certificates] = await Promise.all([listBadges(), listCertificates()]);
  } catch {
    badges = [];
    certificates = [];
  }

  return (
    <div>
      <PageHeader
        title="Recognition"
        description="Badge and certificate catalog, plus manual awards."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <CreateBadgeForm />
        <AwardBadgeForm badges={badges} certificates={certificates} />
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
                {badges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted">
                      No badges yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  badges.map((b) => (
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
                {certificates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted">
                      No certificates yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  certificates.map((c) => (
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
