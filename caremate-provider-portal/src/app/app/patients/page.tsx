import Link from 'next/link';
import { format } from 'date-fns';
import { requireProviderSession } from '@/lib/auth';
import { requireModule } from '@/domains/modules/guard';
import { listConnectedPatients } from '@/domains/patients/repository';
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

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireModule('patients');
  const session = await requireProviderSession();
  const { q, page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const result = await listConnectedPatients(session.activeOrganizationId, {
    search: q,
    page,
  });

  const hrefForPage = (p: number) => hrefWithPage('/app/patients', p, { q });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
            Connected patients
          </h1>
          <p className="mt-1 text-sm text-muted">{result.total} approved connections</p>
        </div>
        <form className="flex gap-2">
          <Input
            name="q"
            placeholder="Search name, CareMate ID, phone"
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
                <TableHead>Staff</TableHead>
                <TableHead>Connected since</TableHead>
                <TableHead>Last activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted">
                    No connected patients yet.
                  </TableCell>
                </TableRow>
              ) : (
                result.rows.map(({ connection, profile, lastActivityAt, membership }) => (
                  <TableRow key={connection.id}>
                    <TableCell>
                      <Link
                        href={`/app/patients/${connection.patient_id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {profile?.full_name ?? 'Unknown'}
                      </Link>
                    </TableCell>
                    <TableCell>{profile?.patient_id ?? '—'}</TableCell>
                    <TableCell>{profile?.phone ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="success">{connection.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {membership ? (
                        <Badge variant="default">Staff</Badge>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {connection.approved_at
                        ? format(new Date(connection.approved_at), 'MMM d, yyyy')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {lastActivityAt
                        ? format(new Date(lastActivityAt), 'MMM d, yyyy')
                        : '—'}
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
