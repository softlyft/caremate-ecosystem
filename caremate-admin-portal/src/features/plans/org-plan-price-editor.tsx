'use client';

import type { ReactNode } from 'react';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';

const INTERVAL_LABEL: Record<string, string> = {
  monthly: 'Monthly',
  yearly: 'Yearly (10% off)',
};

function formatNgn(amountMinor: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

export type OrgPlanPriceBase = {
  id: string;
  plan_tier: string;
  billing_interval: string;
  amount_minor: number;
  patient_connection_cap: number;
  voice_minutes_included: number;
  is_active: boolean;
  paystack_plan_code: string | null;
};

export function OrgPlanPriceEditor<T extends OrgPlanPriceBase>({
  prices,
  canEdit,
  emptyMessage,
  planLabels,
  successMessage,
  onSave,
  renderExtraFields,
  renderExtraCheckboxes,
  renderSummaryNote,
}: {
  prices: T[];
  canEdit: boolean;
  emptyMessage: string;
  planLabels: Record<string, string>;
  successMessage: string;
  onSave: (price: T, formData: FormData) => Promise<void>;
  renderExtraFields?: (price: T, ctx: { canEdit: boolean; pending: boolean }) => ReactNode;
  renderExtraCheckboxes?: (price: T, ctx: { canEdit: boolean; pending: boolean }) => ReactNode;
  renderSummaryNote?: (price: T) => ReactNode;
}) {
  const [pending, startTransition] = useTransition();

  if (prices.length === 0) {
    return (
      <p className="rounded-md border border-border bg-white p-4 text-sm text-muted">{emptyMessage}</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      {prices.map((price) => (
        <form
          key={price.id}
          className="grid gap-3 border-t border-border px-4 py-4 first:border-t-0 md:grid-cols-2 lg:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canEdit) return;
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              try {
                await onSave(price, fd);
                toast.success(successMessage);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Could not save');
              }
            });
          }}
        >
          <div className="md:col-span-2 lg:col-span-3">
            <p className="text-sm font-medium text-foreground">
              {planLabels[price.plan_tier] ?? price.plan_tier}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {INTERVAL_LABEL[price.billing_interval] ?? price.billing_interval}
              <span className="mx-1.5 text-border">·</span>
              {formatNgn(price.amount_minor)}
              {price.billing_interval === 'yearly' ? (
                <>
                  <span className="mx-1.5 text-border">·</span>
                  10% off vs 12× monthly
                </>
              ) : null}
              <span className="mx-1.5 text-border">·</span>
              Paystack
              {renderSummaryNote?.(price)}
              {!price.is_active ? (
                <>
                  <span className="mx-1.5 text-border">·</span>
                  <span className="text-orange-700">Inactive</span>
                </>
              ) : null}
            </p>
          </div>

          <FormField compact label="Amount (₦)" htmlFor={`${price.id}-amount`}>
            <Input
              id={`${price.id}-amount`}
              name="amount_major"
              type="number"
              step="1"
              min="0"
              defaultValue={(price.amount_minor / 100).toFixed(0)}
              disabled={!canEdit || pending}
              required
            />
          </FormField>

          {renderExtraFields?.(price, { canEdit, pending })}

          <FormField compact label="Patient cap" htmlFor={`${price.id}-patients`}>
            <Input
              id={`${price.id}-patients`}
              name="patient_connection_cap"
              type="number"
              min="1"
              defaultValue={price.patient_connection_cap}
              disabled={!canEdit || pending}
              required
            />
          </FormField>

          <FormField compact label="Voice minutes / mo" htmlFor={`${price.id}-voice`}>
            <Input
              id={`${price.id}-voice`}
              name="voice_minutes_included"
              type="number"
              min="0"
              defaultValue={price.voice_minutes_included}
              disabled={!canEdit || pending}
              required
            />
          </FormField>

          <FormField compact label="Paystack plan code" htmlFor={`${price.id}-paystack`}>
            <Input
              id={`${price.id}-paystack`}
              name="paystack_plan_code"
              defaultValue={price.paystack_plan_code ?? ''}
              disabled={!canEdit || pending}
              placeholder="Optional · PLN_…"
            />
          </FormField>

          <div className="flex flex-wrap items-center gap-3 md:col-span-2 lg:col-span-3">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={price.is_active}
                disabled={!canEdit || pending}
              />
              Active
            </label>
            {renderExtraCheckboxes?.(price, { canEdit, pending })}
            {canEdit ? (
              <Button type="submit" loading={pending} loadingLabel="Saving…" size="sm">
                Save
              </Button>
            ) : null}
          </div>
        </form>
      ))}
    </div>
  );
}
