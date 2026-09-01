'use client';

import { updatePayerOrgPlanPrice } from '@/domains/payer-plans/actions';
import type { PayerOrgPlanPrice } from '@/domains/payer-plans/types';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { OrgPlanPriceEditor } from '@/features/plans/org-plan-price-editor';

const PLAN_LABEL: Record<string, string> = {
  basic: 'Support Team Basic',
  pro: 'Support Team Pro',
};

export function PayerPlanPriceEditor({
  prices,
  canEdit,
}: {
  prices: PayerOrgPlanPrice[];
  canEdit: boolean;
}) {
  return (
    <OrgPlanPriceEditor
      prices={prices}
      canEdit={canEdit}
      emptyMessage="No payer plan prices found. Apply the Support Team migration then refresh."
      planLabels={PLAN_LABEL}
      successMessage="Payer plan price saved"
      onSave={async (price, fd) => {
        const amountMajor = Number(fd.get('amount_major'));
        await updatePayerOrgPlanPrice({
          id: price.id,
          amount_minor: Math.round(amountMajor * 100),
          support_team_seat_limit: Number(fd.get('support_team_seat_limit')),
          patient_connection_cap: Number(fd.get('patient_connection_cap')),
          provider_connection_cap: Number(fd.get('provider_connection_cap')),
          voice_minutes_included: Number(fd.get('voice_minutes_included')),
          group_chat_enabled: fd.get('group_chat_enabled') === 'on',
          is_active: fd.get('is_active') === 'on',
          paystack_plan_code: String(fd.get('paystack_plan_code') ?? '').trim() || null,
        });
      }}
      renderSummaryNote={(price) =>
        price.group_chat_enabled ? (
          <>
            <span className="mx-1.5 text-border">·</span>
            Group chat
          </>
        ) : null
      }
      renderExtraFields={(price, { canEdit: editable, pending }) => (
        <>
          <FormField compact label="Support Team seats" htmlFor={`${price.id}-seats`}>
            <Input
              id={`${price.id}-seats`}
              name="support_team_seat_limit"
              type="number"
              min="1"
              defaultValue={price.support_team_seat_limit}
              disabled={!editable || pending}
              required
            />
          </FormField>
          <FormField compact label="Provider connections" htmlFor={`${price.id}-providers`}>
            <Input
              id={`${price.id}-providers`}
              name="provider_connection_cap"
              type="number"
              min="1"
              defaultValue={price.provider_connection_cap}
              disabled={!editable || pending}
              required
            />
          </FormField>
        </>
      )}
      renderExtraCheckboxes={(price, { canEdit: editable, pending }) => (
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="group_chat_enabled"
            defaultChecked={price.group_chat_enabled}
            disabled={!editable || pending}
          />
          Pro group chat (patient + payer + provider)
        </label>
      )}
    />
  );
}
