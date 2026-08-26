import { format } from 'date-fns';
import { requirePayerSession } from '@/lib/auth';
import { listPatientPayerConnectionsByStatus } from '@/domains/patient-payer-connections/repository';
import { hrefWithPage, parsePage } from '@/lib/pagination';
import { PaginationBar } from '@/components/pagination-bar';
import { PatientPayerConnectionActions } from '@/components/features/patient-payer-connection-actions';
import { canWriteOrg } from '@/constants/roles';
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

export default async function ConnectedPatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await requirePayerSession();
  const { q, page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const result = await listPatientPayerConnectionsByStatus(
    session.activeOrganizationId,
    'approved',
    { page },
  );
  const canWrite = canWriteOrg(session.activeRole);

  const query = (q ?? '').trim().toLowerCase();
  const rows = query
    ? result.rows.filter((r) => {
        const name = r.profile?.full_name?.toLowerCase() ?? '';
        const caremateId = r.profile?.patient_id?.toLowerCase() ?? '';
        const phone = r.profile?.phone?.toLowerCase() ?? '';
        return name.includes(query) || caremateId.includes(query) || phone.includes(query);
      })
    : result.rows;

  const hrefForPage = (p: number) => hrefWithPage('/payer/patients', p, { q });

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
                <TableHead>Connected since</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted">
                    No connected patients yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.profile?.full_name ?? 'Unknown'}
                    </TableCell>
                    <TableCell>{r.profile?.patient_id ?? '—'}</TableCell>
                    <TableCell>{r.profile?.phone ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="success">{r.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {r.approved_at ? format(new Date(r.approved_at), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    <TableCell>
                      {canWrite ? (
                        <PatientPayerConnectionActions connectionId={r.id} mode="approved" />
                      ) : null}
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
