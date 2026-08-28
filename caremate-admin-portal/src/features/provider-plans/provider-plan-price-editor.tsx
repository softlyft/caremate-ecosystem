'use client';

import { updateProviderOrgPlanPrice } from '@/domains/provider-plans/actions';
import type { ProviderOrgPlanPrice } from '@/domains/provider-plans/types';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { OrgPlanPriceEditor } from '@/features/plans/org-plan-price-editor';

const PLAN_LABEL: Record<string, string> = {
  basic: 'Private Care Team Basic',
  pro: 'Private Care Team Pro',
};

export function ProviderPlanPriceEditor({
  prices,
  canEdit,
}: {
  prices: ProviderOrgPlanPrice[];
  canEdit: boolean;
}) {
  return (
    <OrgPlanPriceEditor
      prices={prices}
      canEdit={canEdit}
      emptyMessage="No provider plan prices found. Apply the Private Care Team migration then refresh."
      planLabels={PLAN_LABEL}
      successMessage="Provider plan price saved"
      onSave={async (price, fd) => {
        const amountMajor = Number(fd.get('amount_major'));
        await updateProviderOrgPlanPrice({
          id: price.id,
          amount_minor: Math.round(amountMajor * 100),
          pct_seat_limit: Number(fd.get('pct_seat_limit')),
          patient_connection_cap: Number(fd.get('patient_connection_cap')),
          voice_minutes_included: Number(fd.get('voice_minutes_included')),
          video_minutes_included: Number(fd.get('video_minutes_included')),
          is_active: fd.get('is_active') === 'on',
          paystack_plan_code: String(fd.get('paystack_plan_code') ?? '').trim() || null,
        });
      }}
      renderExtraFields={(price, { canEdit: editable, pending }) => (
        <>
          <FormField compact label="PCT seats" htmlFor={`${price.id}-seats`}>
            <Input
              id={`${price.id}-seats`}
              name="pct_seat_limit"
              type="number"
              min="1"
              defaultValue={price.pct_seat_limit}
              disabled={!editable || pending}
              required
            />
          </FormField>
          <FormField compact label="Video minutes / mo" htmlFor={`${price.id}-video`}>
            <Input
              id={`${price.id}-video`}
              name="video_minutes_included"
              type="number"
              min="0"
              defaultValue={price.video_minutes_included}
              disabled={!editable || pending}
              required
            />
          </FormField>
        </>
      )}
    />
  );
}
