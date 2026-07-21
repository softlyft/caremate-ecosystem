'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { sendBroadcastAction } from '@/domains/broadcasts/actions';

export function BroadcastComposeForm({
  patients,
}: {
  patients: { id: string; label: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [audience, setAudience] = useState<'all' | 'selected'>('all');
  const [selected, setSelected] = useState<string[]>([]);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        formData.set('audience', audience);
        if (audience === 'selected') {
          formData.set('patient_ids', selected.join(','));
        }
        startTransition(async () => {
          try {
            await sendBroadcastAction(formData);
            toast.success('Broadcast sent');
            e.currentTarget.reset();
            setSelected([]);
            setAudience('all');
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to send');
          }
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required placeholder="Flu vaccines available" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" required placeholder="Write your announcement…" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="audience">Audience</Label>
        <Select
          id="audience"
          value={audience}
          onChange={(e) => setAudience(e.target.value as 'all' | 'selected')}
        >
          <option value="all">All connected patients</option>
          <option value="selected">Selected patients</option>
        </Select>
      </div>
      {audience === 'selected' && (
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
      )}
      <div className="space-y-2">
        <Label htmlFor="expires_at">Expires at (optional)</Label>
        <Input id="expires_at" name="expires_at" type="datetime-local" />
      </div>
      <Button type="submit" loading={pending} loadingLabel="Sending…">
        Send broadcast
      </Button>
    </form>
  );
}
