import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { requireModule } from '@/domains/modules/guard';
import { requireProviderSession } from '@/lib/auth';
import { getLabOrder } from '@/domains/lab/repository';
import {
  AdvanceLabOrderButton,
  SaveLabResultForm,
} from '@/components/features/lab-order-actions';
import { canWriteOrg } from '@/constants/roles';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const STATUS_VARIANT: Record<string, 'default' | 'warning' | 'success' | 'danger' | 'secondary'> = {
  ordered: 'warning',
  sample_collected: 'default',
  processing: 'default',
  awaiting_validation: 'warning',
  validated: 'success',
  reported: 'secondary',
  cancelled: 'danger',
};

export default async function LabOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireModule('laboratory');
  const session = await requireProviderSession();
  const { id } = await params;
  const order = await getLabOrder(session.activeOrganizationId, id);
  if (!order) notFound();

  const canWrite = canWriteOrg(session.activeRole);
  const canEnterResults =
    canWrite &&
    (order.status === 'processing' ||
      order.status === 'awaiting_validation' ||
      order.status === 'sample_collected');

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/lab" className="text-sm text-primary hover:underline">
          ← Laboratory
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
            {order.profile?.full_name ?? 'Patient'} — order
          </h1>
          <Badge variant={STATUS_VARIANT[order.status] ?? 'secondary'}>
            {order.status.replace(/_/g, ' ')}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted">
          Ordered {format(new Date(order.ordered_at), 'dd MMM yyyy HH:mm')}
          {order.profile?.patient_id ? ` · ${order.profile.patient_id}` : ''}
        </p>
      </div>

      {order.clinical_notes ? (
        <Card>
          <CardHeader>
            <CardTitle>Clinical notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{order.clinical_notes}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Workflow</CardTitle>
          <CardDescription>
            ordered → sample collected → processing → awaiting validation → validated → reported
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted">
          <ul className="space-y-1">
            {order.sample_collected_at ? (
              <li>Sample collected {format(new Date(order.sample_collected_at), 'dd MMM yyyy HH:mm')}</li>
            ) : null}
            {order.processing_started_at ? (
              <li>
                Processing started{' '}
                {format(new Date(order.processing_started_at), 'dd MMM yyyy HH:mm')}
              </li>
            ) : null}
            {order.validated_at ? (
              <li>Validated {format(new Date(order.validated_at), 'dd MMM yyyy HH:mm')}</li>
            ) : null}
            {order.reported_at ? (
              <li>Reported {format(new Date(order.reported_at), 'dd MMM yyyy HH:mm')}</li>
            ) : null}
          </ul>
          {canWrite ? (
            <AdvanceLabOrderButton orderId={order.id} status={order.status} />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tests & results</CardTitle>
          <CardDescription>{order.items.length} item{order.items.length === 1 ? '' : 's'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {order.items.map((item) => (
            <div key={item.id} className="rounded-lg border border-border p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {item.test?.code ?? '—'} — {item.test?.name ?? 'Test'}
                  </p>
                  <p className="text-xs text-muted capitalize">{item.status}</p>
                </div>
                {item.result_flag ? (
                  <Badge variant={item.result_flag === 'critical' ? 'danger' : 'default'}>
                    {item.result_flag}
                  </Badge>
                ) : null}
              </div>

              {item.result_value ? (
                <dl className="mb-3 grid gap-1 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted">Value</dt>
                    <dd className="font-medium">
                      {item.result_value}
                      {item.result_unit ? ` ${item.result_unit}` : ''}
                    </dd>
                  </div>
                  {item.reference_range ? (
                    <div>
                      <dt className="text-muted">Reference</dt>
                      <dd>{item.reference_range}</dd>
                    </div>
                  ) : null}
                  {item.result_notes ? (
                    <div className="sm:col-span-2">
                      <dt className="text-muted">Notes</dt>
                      <dd className="whitespace-pre-wrap">{item.result_notes}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}

              {canEnterResults && item.status === 'pending' ? (
                <SaveLabResultForm
                  orderId={order.id}
                  itemId={item.id}
                  defaultUnit={item.test?.unit}
                  defaultRange={item.test?.reference_range}
                />
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
