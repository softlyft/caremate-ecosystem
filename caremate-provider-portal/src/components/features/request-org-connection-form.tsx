'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField, formInlineGridClassName } from '@/components/ui/form-field';
import { requestPayerConnectionByEmailAction } from '@/domains/payer-connections/actions';
import { buildRejectedResendConfirmMessage } from '@/domains/payer-connections/errors';
import type { RequestOrgConnectionResult } from '@/lib/action-result';

type RequestOrgConnectionAction = (formData: FormData) => Promise<RequestOrgConnectionResult>;

export function RequestOrgConnectionForm({
  requestAction = requestPayerConnectionByEmailAction,
  emailLabel = 'Payer claim email',
  emailPlaceholder = 'claims@insurer.example',
  noteFieldName = 'provider_note',
  notePlaceholder = 'e.g. Network participation request',
  successMessage = 'Connection request sent — waiting for the payer to approve',
}: {
  requestAction?: RequestOrgConnectionAction;
  emailLabel?: string;
  emailPlaceholder?: string;
  noteFieldName?: 'provider_note' | 'payer_note';
  notePlaceholder?: string;
  successMessage?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className={formInlineGridClassName}
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        startTransition(async () => {
          try {
            const submit = async (confirmResend: boolean) => {
              const payload = new FormData(form);
              if (confirmResend) {
                payload.set('confirm_resend', '1');
              }
              return requestAction(payload);
            };

            let result = await submit(false);
            if (!result.ok && 'needsResendConfirm' in result && result.needsResendConfirm) {
              const confirmed = window.confirm(
                buildRejectedResendConfirmMessage(result.rejectionReason),
              );
              if (!confirmed) {
                return;
              }
              result = await submit(true);
            }

            if (!result.ok) {
              if ('error' in result) {
                toast.error(result.error);
              }
              return;
            }
            toast.success(successMessage);
            form.reset();
          } catch {
            toast.error('Failed to request connection');
          }
        });
      }}
    >
      <FormField label={emailLabel} htmlFor="claim_email">
        <Input
          id="claim_email"
          name="claim_email"
          type="email"
          required
          autoComplete="off"
          placeholder={emailPlaceholder}
        />
      </FormField>
      <FormField label="Note (optional)" htmlFor={noteFieldName}>
        <Textarea
          id={noteFieldName}
          name={noteFieldName}
          rows={1}
          placeholder={notePlaceholder}
          className="min-h-[42px] resize-none"
        />
      </FormField>
      <Button type="submit" loading={pending} loadingLabel="Sending…" className="sm:mb-0.5">
        Request connection
      </Button>
    </form>
  );
}
