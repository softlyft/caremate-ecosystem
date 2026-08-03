import Link from 'next/link';
import { format } from 'date-fns';
import { requireModule } from '@/domains/modules/guard';
import { requireProviderSession } from '@/lib/auth';
import { listLabOrders, listLabTests } from '@/domains/lab/repository';
import { listConnectionsByStatus } from '@/domains/connections/repository';
import { hrefWithPage, parsePage } from '@/lib/pagination';
import { PaginationBar } from '@/components/pagination-bar';
import { CreateLabOrderForm } from '@/components/features/create-lab-order-form';
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

const STATUS_VARIANT: Record<string, 'default' | 'warning' | 'success' | 'danger' | 'secondary'> = {
  ordered: 'warning',
  sample_collected: 'default',
  processing: 'default',
  awaiting_validation: 'warning',
  validated: 'success',
  reported: 'secondary',
  cancelled: 'danger',
};

export default async function LabPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireModule('laboratory');
  const session = await requireProviderSession();
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const canWrite = canWriteOrg(session.activeRole);

  const [orders, tests, connected] = await Promise.all([
    listLabOrders(session.activeOrganizationId, { page }),
    listLabTests(session.activeOrganizationId),
    listConnectionsByStatus(session.activeOrganizationId, 'approved', { pageSize: 100 }),
  ]);

  const patients = connected.rows.map((c) => ({
    userId: c.patient_id,
    label: `${c.profile?.full_name ?? 'Patient'}${
      c.profile?.patient_id ? ` · ${c.profile.patient_id}` : ''
    }`,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">Laboratory</h1>
          <p className="mt-1 text-sm text-muted">
            Order tests, collect samples, enter results, validate, and report.
          </p>
        </div>
        <Link
          href="/app/lab/tests"
          className="inline-flex h-10 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-surface-muted"
        >
          Test catalog
        </Link>
      </div>

      {canWrite ? (
        <Card>
          <CardHeader>
            <CardTitle>New order</CardTitle>
            <CardDescription>For a connected patient. Results stay in the portal for now.</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateLabOrderForm
              patients={patients}
              tests={tests.map((t) => ({ id: t.id, code: t.code, name: t.name }))}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>
            {orders.total} order{orders.total === 1 ? '' : 's'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orders.rows.length === 0 ? (
            <p className="text-sm text-muted">No laboratory orders yet.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Tests</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ordered</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.rows.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="font-medium">
                          {order.profile?.full_name ?? 'Patient'}
                        </div>
                        {order.profile?.patient_id ? (
                          <div className="text-xs text-muted">{order.profile.patient_id}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="max-w-xs text-sm text-muted">
                        {order.items
                          .map((i) => i.test?.code ?? '—')
                          .join(', ') || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[order.status] ?? 'secondary'}>
                          {order.status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted">
                        {format(new Date(order.ordered_at), 'dd MMM yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/app/lab/orders/${order.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          Open
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PaginationBar
                result={orders}
                hrefForPage={(p) => hrefWithPage('/app/lab', p)}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
