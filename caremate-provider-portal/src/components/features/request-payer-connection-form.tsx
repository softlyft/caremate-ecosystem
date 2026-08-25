'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { requestPayerConnectionByEmailAction } from '@/domains/payer-connections/actions';
import { mapPayerConnectionError } from '@/domains/payer-connections/errors';

export function RequestPayerConnectionForm() {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);
        startTransition(async () => {
          try {
            await requestPayerConnectionByEmailAction(formData);
            toast.success('Connection request sent — waiting for the payer to approve');
            form.reset();
          } catch (err) {
            toast.error(mapPayerConnectionError(err, 'Failed to request connection'));
          }
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="claim_email">Payer claim email</Label>
        <Input
          id="claim_email"
          name="claim_email"
          type="email"
          required
          autoComplete="off"
          placeholder="claims@insurer.example"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="provider_note">Note (optional)</Label>
        <Textarea
          id="provider_note"
          name="provider_note"
          rows={1}
          placeholder="e.g. Network participation request"
          className="min-h-[42px] resize-none"
        />
      </div>
      <Button type="submit" loading={pending} loadingLabel="Sending…" className="sm:mb-0.5">
        Request connection
      </Button>
    </form>
  );
}
