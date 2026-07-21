'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { requestConnectionByCaremateIdAction } from '@/domains/connections/actions';

export function RequestConnectionForm() {
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
            await requestConnectionByCaremateIdAction(formData);
            toast.success('Connection request sent — waiting for the patient to approve');
            form.reset();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to request connection');
          }
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="caremate_id">CareMate Patient ID</Label>
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
      </div>
      <div className="space-y-2">
        <Label htmlFor="provider_note">Note (optional)</Label>
        <Textarea
          id="provider_note"
          name="provider_note"
          rows={1}
          placeholder="e.g. Follow-up after walk-in visit"
          className="min-h-[42px] resize-none"
        />
      </div>
      <Button type="submit" loading={pending} loadingLabel="Sending…" className="sm:mb-0.5">
        Request connection
      </Button>
    </form>
  );
}
