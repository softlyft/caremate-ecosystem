import { formatDistanceToNow } from 'date-fns';
import { listProfiles } from '@/domains/community/repository';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function CommunityProfilesPage() {
  let profiles: Awaited<ReturnType<typeof listProfiles>> = [];
  try {
    profiles = await listProfiles();
  } catch {
    profiles = [];
  }

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
              {profiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted">
                    No community members found.
                  </TableCell>
                </TableRow>
              ) : (
                profiles.map((p) => (
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
        </CardContent>
      </Card>
    </div>
  );
}
