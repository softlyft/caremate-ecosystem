'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField, FormStack } from '@/components/ui/form-field';
import { sendBroadcastAction } from '@/domains/broadcasts/actions';

type SendBroadcastAction = typeof sendBroadcastAction;

export function BroadcastComposeForm({
  patients,
  sendAction = sendBroadcastAction,
}: {
  patients: { id: string; label: string }[];
  sendAction?: SendBroadcastAction;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [audience, setAudience] = useState<'all' | 'selected'>('all');
  const [selected, setSelected] = useState<string[]>([]);

  return (
    <form
      ref={formRef}
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = formRef.current;
        if (!form) {
          return;
        }
        const formData = new FormData(form);
        formData.set('audience', audience);
        if (audience === 'selected') {
          formData.set('patient_ids', selected.join(','));
        }
        startTransition(async () => {
          try {
            await sendAction(formData);
            formRef.current?.reset();
            setSelected([]);
            setAudience('all');
            toast.success('Message sent');
            router.refresh();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to send');
          }
        });
      }}
    >
      <FormStack>
        <FormField label="Subject (optional)" htmlFor="title">
          <Input id="title" name="title" placeholder="Flu vaccines available" />
        </FormField>
        <FormField label="Message" htmlFor="message">
          <Textarea id="message" name="message" required placeholder="Write your message…" />
        </FormField>
        <FormField label="Audience" htmlFor="audience">
          <Select
            id="audience"
            value={audience}
            onChange={(e) => setAudience(e.target.value as 'all' | 'selected')}
          >
            <option value="all">All connected patients</option>
            <option value="selected">Selected patients</option>
          </Select>
        </FormField>
        {audience === 'selected' ? (
          <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-border p-3">
            {patients.length === 0 ? (
              <p className="text-xs text-muted">No connected patients.</p>
            ) : (
              patients.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.includes(p.id)}
                    onChange={(e) => {
                      setSelected((prev) =>
                        e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id),
                      );
                    }}
                  />
                  {p.label}
                </label>
              ))
            )}
          </div>
        ) : null}
        <FormField label="Expires at (optional)" htmlFor="expires_at">
          <Input id="expires_at" name="expires_at" type="datetime-local" />
        </FormField>
      </FormStack>
      <Button type="submit" loading={pending} loadingLabel="Sending…">
        Send message
      </Button>
    </form>
  );
}
