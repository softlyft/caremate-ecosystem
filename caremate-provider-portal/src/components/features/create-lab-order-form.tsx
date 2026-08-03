'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { createLabOrderAction } from '@/domains/lab/actions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export function CreateLabOrderForm({
  patients,
  tests,
}: {
  patients: Array<{ userId: string; label: string }>;
  tests: Array<{ id: string; code: string; name: string }>;
}) {
  const [pending, start] = useTransition();

  if (patients.length === 0) {
    return (
      <p className="text-sm text-muted">
        Connect a patient first, then you can place laboratory orders.
      </p>
    );
  }

  if (tests.length === 0) {
    return (
      <p className="text-sm text-muted">
        Add at least one test to your catalog before creating an order.
      </p>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          try {
            await createLabOrderAction(fd);
            toast.success('Lab order created');
            (e.target as HTMLFormElement).reset();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not create order');
          }
        });
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="patient_id">Connected patient</Label>
        <Select id="patient_id" name="patient_id" required defaultValue="">
          <option value="" disabled>
            Select patient
          </option>
          {patients.map((p) => (
            <option key={p.userId} value={p.userId}>
              {p.label}
            </option>
          ))}
        </Select>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">Tests</legend>
        <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-border p-3">
          {tests.map((t) => (
            <label key={t.id} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                name="test_definition_id"
                value={t.id}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">{t.code}</span>
                <span className="text-muted"> — {t.name}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1">
        <Label htmlFor="clinical_notes">Clinical notes</Label>
        <Textarea id="clinical_notes" name="clinical_notes" rows={3} />
      </div>

      <Button type="submit" loading={pending}>
        Create order
      </Button>
    </form>
  );
}
