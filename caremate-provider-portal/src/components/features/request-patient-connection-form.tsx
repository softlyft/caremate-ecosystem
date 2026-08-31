'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField, formInlineGridClassName } from '@/components/ui/form-field';
import { requestConnectionByCaremateIdAction } from '@/domains/connections/actions';

type RequestPatientConnectionAction = typeof requestConnectionByCaremateIdAction;

export function RequestPatientConnectionForm({
  requestAction = requestConnectionByCaremateIdAction,
  noteFieldName = 'provider_note',
  notePlaceholder = 'e.g. Follow-up after walk-in visit',
  formatError = (err, fallback) => (err instanceof Error ? err.message : fallback),
}: {
  requestAction?: RequestPatientConnectionAction;
  noteFieldName?: 'provider_note' | 'payer_note';
  notePlaceholder?: string;
  formatError?: (err: unknown, fallback: string) => string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className={formInlineGridClassName}
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);
        startTransition(async () => {
          try {
            await requestAction(formData);
            toast.success('Connection request sent — waiting for the patient to approve');
            form.reset();
          } catch (err) {
            toast.error(formatError(err, 'Failed to request connection'));
          }
        });
      }}
    >
      <FormField label="CareMate Patient ID" htmlFor="caremate_id">
        <Input
          id="caremate_id"
          name="caremate_id"
          required
          inputMode="numeric"
          autoComplete="off"
          placeholder="XXXX XXXX XXXX"
          pattern="[\d\s]{12,14}"
          title="12-digit CareMate Patient ID"
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
