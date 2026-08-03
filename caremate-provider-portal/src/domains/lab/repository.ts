import { createClient } from '@/lib/supabase/server';
import { insertActivity } from '@/domains/activity/repository';
import {
  DEFAULT_PAGE_SIZE,
  emptyPage,
  pageRange,
  paginatedResult,
  parsePage,
  type PaginatedResult,
} from '@/lib/pagination';
import type {
  LabOrder,
  LabOrderItem,
  LabOrderStatus,
  LabTestDefinition,
  Profile,
} from '@/types/database';

export type LabOrderWithProfile = LabOrder & {
  profile: Pick<Profile, 'full_name' | 'patient_id'> | null;
  items: Array<
    LabOrderItem & {
      test?: Pick<LabTestDefinition, 'code' | 'name' | 'unit' | 'reference_range'> | null;
    }
  >;
};

export async function listLabTests(
  organizationId: string,
  options?: { activeOnly?: boolean },
): Promise<LabTestDefinition[]> {
  const supabase = await createClient();
  let query = supabase
    .from('lab_test_definitions')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true });
  if (options?.activeOnly !== false) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as LabTestDefinition[];
}

export async function createLabTest(input: {
  organizationId: string;
  code: string;
  name: string;
  description?: string;
  specimenType?: string;
  unit?: string | null;
  referenceRange?: string | null;
}): Promise<LabTestDefinition> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lab_test_definitions')
    .insert({
      organization_id: input.organizationId,
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      description: input.description?.trim() ?? '',
      specimen_type: input.specimenType?.trim() || 'blood',
      unit: input.unit?.trim() || null,
      reference_range: input.referenceRange?.trim() || null,
      active: true,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as LabTestDefinition;
}

export async function listLabOrders(
  organizationId: string,
  options?: { status?: LabOrderStatus; page?: number; pageSize?: number },
): Promise<PaginatedResult<LabOrderWithProfile>> {
  const supabase = await createClient();
  const page = parsePage(options?.page);
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const { from, to } = pageRange(page, pageSize);

  let query = supabase
    .from('lab_orders')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('ordered_at', { ascending: false })
    .range(from, to);
  if (options?.status) query = query.eq('status', options.status);

  const { data, error, count } = await query;
  if (error) throw error;
  const rows = (data ?? []) as LabOrder[];
  if (!rows.length) return emptyPage(page, pageSize);

  const orderIds = rows.map((r) => r.id);
  const patientIds = [...new Set(rows.map((r) => r.patient_id))];

  const [{ data: profiles }, { data: items }] = await Promise.all([
    supabase.from('profiles').select('user_id, full_name, patient_id').in('user_id', patientIds),
    supabase.from('lab_order_items').select('*').in('order_id', orderIds),
  ]);

  const testIds = [...new Set((items ?? []).map((i) => i.test_definition_id))];
  const { data: tests } =
    testIds.length > 0
      ? await supabase
          .from('lab_test_definitions')
          .select('id, code, name, unit, reference_range')
          .in('id', testIds)
      : { data: [] };

  const profileByUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  const testById = new Map((tests ?? []).map((t) => [t.id, t]));
  const itemsByOrder = new Map<string, LabOrderItem[]>();
  for (const item of (items ?? []) as LabOrderItem[]) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  const enriched: LabOrderWithProfile[] = rows.map((row) => {
    const profile = profileByUser.get(row.patient_id);
    return {
      ...row,
      profile: profile
        ? { full_name: profile.full_name, patient_id: profile.patient_id }
        : null,
      items: (itemsByOrder.get(row.id) ?? []).map((item) => {
        const test = testById.get(item.test_definition_id);
        return {
          ...item,
          test: test
            ? {
                code: test.code,
                name: test.name,
                unit: test.unit,
                reference_range: test.reference_range,
              }
            : null,
        };
      }),
    };
  });

  return paginatedResult(enriched, count, page, pageSize);
}

export async function getLabOrder(
  organizationId: string,
  orderId: string,
): Promise<LabOrderWithProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lab_orders')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', orderId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const order = data as LabOrder;
  const [{ data: profile }, { data: items }] = await Promise.all([
    supabase
      .from('profiles')
      .select('user_id, full_name, patient_id')
      .eq('user_id', order.patient_id)
      .maybeSingle(),
    supabase.from('lab_order_items').select('*').eq('order_id', order.id),
  ]);

  const testIds = [...new Set((items ?? []).map((i) => i.test_definition_id))];
  const { data: tests } =
    testIds.length > 0
      ? await supabase
          .from('lab_test_definitions')
          .select('id, code, name, unit, reference_range')
          .in('id', testIds)
      : { data: [] };
  const testById = new Map((tests ?? []).map((t) => [t.id, t]));

  return {
    ...order,
    profile: profile
      ? { full_name: profile.full_name, patient_id: profile.patient_id }
      : null,
    items: ((items ?? []) as LabOrderItem[]).map((item) => {
      const test = testById.get(item.test_definition_id);
      return {
        ...item,
        test: test
          ? {
              code: test.code,
              name: test.name,
              unit: test.unit,
              reference_range: test.reference_range,
            }
          : null,
      };
    }),
  };
}

export async function createLabOrder(input: {
  organizationId: string;
  patientId: string;
  testDefinitionIds: string[];
  clinicalNotes?: string | null;
  orderedBy: string;
}): Promise<LabOrder> {
  if (input.testDefinitionIds.length === 0) {
    throw new Error('Select at least one test');
  }

  const supabase = await createClient();
  const { data: connection, error: connError } = await supabase
    .from('patient_provider_connections')
    .select('id')
    .eq('organization_id', input.organizationId)
    .eq('patient_id', input.patientId)
    .eq('status', 'approved')
    .maybeSingle();
  if (connError) throw connError;
  if (!connection) throw new Error('Patient must be connected');

  const { data: order, error } = await supabase
    .from('lab_orders')
    .insert({
      organization_id: input.organizationId,
      patient_id: input.patientId,
      status: 'ordered',
      clinical_notes: input.clinicalNotes ?? null,
      ordered_by: input.orderedBy,
    })
    .select('*')
    .single();
  if (error) throw error;

  const { error: itemsError } = await supabase.from('lab_order_items').insert(
    input.testDefinitionIds.map((testId) => ({
      order_id: order.id,
      test_definition_id: testId,
      status: 'pending' as const,
    })),
  );
  if (itemsError) throw itemsError;

  await insertActivity({
    organizationId: input.organizationId,
    patientId: input.patientId,
    connectionId: connection.id,
    eventType: 'lab_order_created',
    summary: 'Laboratory order created',
    metadata: { order_id: order.id },
  });

  return order as LabOrder;
}

const STATUS_FLOW: LabOrderStatus[] = [
  'ordered',
  'sample_collected',
  'processing',
  'awaiting_validation',
  'validated',
  'reported',
];

export async function advanceLabOrder(input: {
  organizationId: string;
  orderId: string;
  userId: string;
  specimenType?: string | null;
}): Promise<LabOrder> {
  const supabase = await createClient();
  const { data: existing, error: loadError } = await supabase
    .from('lab_orders')
    .select('*')
    .eq('id', input.orderId)
    .eq('organization_id', input.organizationId)
    .single();
  if (loadError) throw loadError;

  const current = existing.status as LabOrderStatus;
  if (current === 'cancelled' || current === 'reported') {
    throw new Error('Order cannot be advanced further');
  }
  const idx = STATUS_FLOW.indexOf(current);
  if (idx < 0 || idx >= STATUS_FLOW.length - 1) {
    throw new Error('Invalid order status');
  }
  const next = STATUS_FLOW[idx + 1]!;
  const now = new Date().toISOString();
  const patch: Partial<LabOrder> = { status: next };

  if (next === 'sample_collected') {
    patch.sample_collected_at = now;
    patch.sample_collected_by = input.userId;
    if (input.specimenType) patch.specimen_type = input.specimenType;
  } else if (next === 'processing') {
    patch.processing_started_at = now;
  } else if (next === 'validated') {
    patch.validated_at = now;
    patch.validated_by = input.userId;
  } else if (next === 'reported') {
    patch.reported_at = now;
    patch.patient_notified_at = now;
  }

  const { data, error } = await supabase
    .from('lab_orders')
    .update(patch)
    .eq('id', input.orderId)
    .eq('organization_id', input.organizationId)
    .select('*')
    .single();
  if (error) throw error;

  await insertActivity({
    organizationId: input.organizationId,
    patientId: data.patient_id,
    eventType: `lab_order_${next}`,
    summary: `Laboratory order ${next.replace(/_/g, ' ')}`,
    metadata: { order_id: data.id },
  });

  return data as LabOrder;
}

export async function saveLabItemResult(input: {
  organizationId: string;
  itemId: string;
  resultValue: string;
  resultUnit?: string | null;
  referenceRange?: string | null;
  resultFlag?: LabOrderItem['result_flag'];
  resultNotes?: string | null;
}): Promise<void> {
  const supabase = await createClient();
  const { data: item, error: itemError } = await supabase
    .from('lab_order_items')
    .select('id, order_id')
    .eq('id', input.itemId)
    .single();
  if (itemError) throw itemError;

  const { data: order, error: orderError } = await supabase
    .from('lab_orders')
    .select('id, organization_id')
    .eq('id', item.order_id)
    .eq('organization_id', input.organizationId)
    .single();
  if (orderError) throw orderError;
  if (!order) throw new Error('Order not found');

  const { error } = await supabase
    .from('lab_order_items')
    .update({
      result_value: input.resultValue,
      result_unit: input.resultUnit ?? null,
      reference_range: input.referenceRange ?? null,
      result_flag: input.resultFlag ?? null,
      result_notes: input.resultNotes ?? null,
      status: 'completed',
    })
    .eq('id', input.itemId);
  if (error) throw error;
}
