'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { advanceLabOrderAction, saveLabResultAction } from '@/domains/lab/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { LabOrderStatus } from '@/types/database';

const NEXT_LABEL: Partial<Record<LabOrderStatus, string>> = {
  ordered: 'Mark sample collected',
  sample_collected: 'Start processing',
  processing: 'Send for validation',
  awaiting_validation: 'Validate results',
  validated: 'Report to patient',
};

export function AdvanceLabOrderButton({
  orderId,
  status,
}: {
  orderId: string;
  status: LabOrderStatus;
}) {
  const [pending, start] = useTransition();
  const label = NEXT_LABEL[status];
  if (!label) return null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          try {
            await advanceLabOrderAction(fd);
            toast.success('Order updated');
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not advance order');
          }
        });
      }}
    >
      <input type="hidden" name="order_id" value={orderId} />
      {status === 'ordered' ? (
        <div className="mb-3 space-y-1">
          <Label htmlFor="specimen_type">Specimen type</Label>
          <Select id="specimen_type" name="specimen_type" defaultValue="blood">
            <option value="blood">Blood</option>
            <option value="urine">Urine</option>
            <option value="swab">Swab</option>
            <option value="stool">Stool</option>
            <option value="other">Other</option>
          </Select>
        </div>
      ) : null}
      <Button type="submit" loading={pending}>
        {label}
      </Button>
    </form>
  );
}

export function SaveLabResultForm({
  orderId,
  itemId,
  defaultUnit,
  defaultRange,
}: {
  orderId: string;
  itemId: string;
  defaultUnit?: string | null;
  defaultRange?: string | null;
}) {
  const [pending, start] = useTransition();

  return (
    <form
      className="grid gap-2 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          try {
            await saveLabResultAction(fd);
            toast.success('Result saved');
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not save result');
          }
        });
      }}
    >
      <input type="hidden" name="order_id" value={orderId} />
      <input type="hidden" name="item_id" value={itemId} />
      <div className="space-y-1">
        <Label htmlFor={`result_value_${itemId}`}>Value</Label>
        <Input id={`result_value_${itemId}`} name="result_value" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`result_unit_${itemId}`}>Unit</Label>
        <Input
          id={`result_unit_${itemId}`}
          name="result_unit"
          defaultValue={defaultUnit ?? ''}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`reference_range_${itemId}`}>Reference range</Label>
        <Input
          id={`reference_range_${itemId}`}
          name="reference_range"
          defaultValue={defaultRange ?? ''}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`result_flag_${itemId}`}>Flag</Label>
        <Select id={`result_flag_${itemId}`} name="result_flag" defaultValue="">
          <option value="">None</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
          <option value="high">High</option>
          <option value="abnormal">Abnormal</option>
          <option value="critical">Critical</option>
        </Select>
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor={`result_notes_${itemId}`}>Notes</Label>
        <Textarea id={`result_notes_${itemId}`} name="result_notes" rows={2} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" size="sm" loading={pending}>
          Save result
        </Button>
      </div>
    </form>
  );
}
