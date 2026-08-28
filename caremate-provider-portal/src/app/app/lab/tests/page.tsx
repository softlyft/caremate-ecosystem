import { PageHeader, PageShell } from '@/components/page-header';
import { TextLink } from '@/components/ui/text-link';
import { requireModule } from '@/domains/modules/guard';
import { requireProviderSession } from '@/lib/auth';
import { listLabTests } from '@/domains/lab/repository';
import { CreateLabTestForm } from '@/components/features/create-lab-test-form';
import { canWriteOrg } from '@/constants/roles';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function LabTestsPage() {
  await requireModule('laboratory');
  const session = await requireProviderSession();
  const canWrite = canWriteOrg(session.activeRole);
  const tests = await listLabTests(session.activeOrganizationId, { activeOnly: false });

  return (
    <PageShell>
      <TextLink href="/app/lab">← Laboratory</TextLink>
      <PageHeader
        title="Test catalog"
        description="Define the tests your organization offers. Codes must be unique per org."
      />

      {canWrite ? (
        <Card>
          <CardHeader>
            <CardTitle>Add test</CardTitle>
            <CardDescription>Appears on new orders immediately when active.</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateLabTestForm />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Catalog</CardTitle>
          <CardDescription>{tests.length} test{tests.length === 1 ? '' : 's'}</CardDescription>
        </CardHeader>
        <CardContent>
          {tests.length === 0 ? (
            <p className="text-sm text-muted">No tests defined yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Specimen</TableHead>
                  <TableHead>Unit / range</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.code}</TableCell>
                    <TableCell>
                      <div>{t.name}</div>
                      {t.description ? (
                        <div className="text-xs text-muted">{t.description}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="capitalize">{t.specimen_type}</TableCell>
                    <TableCell className="text-sm text-muted">
                      {[t.unit, t.reference_range].filter(Boolean).join(' · ') || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.active ? 'success' : 'secondary'}>
                        {t.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
