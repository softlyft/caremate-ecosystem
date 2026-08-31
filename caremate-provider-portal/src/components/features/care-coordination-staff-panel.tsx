'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormActions } from '@/components/ui/form-field';
import { Select } from '@/components/ui/select';
import type { CareCoordinationStaffCandidate } from '@/domains/messaging/care-coordination';

type AddStaffAction = (formData: FormData) => Promise<void>;

export function CareCoordinationStaffPanel({
  conversationId,
  candidates,
  addAction,
}: {
  conversationId: string;
  candidates: CareCoordinationStaffCandidate[];
  addAction: AddStaffAction;
}) {
  const [pending, startTransition] = useTransition();
  const available = candidates.filter((c) => !c.already_added);
  const [selectedUserId, setSelectedUserId] = useState(available[0]?.user_id ?? '');

  if (!candidates.length) {
    return <p className="text-sm text-muted">No staff members available to add.</p>;
  }

  return (
    <form
      className="space-y-3 border-t border-border pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!selectedUserId) return;
        const formData = new FormData();
        formData.set('conversation_id', conversationId);
        formData.set('user_id', selectedUserId);
        startTransition(async () => {
          try {
            await addAction(formData);
            toast.success('Staff member added to chat');
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to add staff');
          }
        });
      }}
    >
      <p className="text-sm font-medium text-brand-navy">Add staff to this care team chat</p>
      <p className="text-xs text-muted">
        Optional — added staff can participate as individuals alongside your organization.
      </p>
      {available.length === 0 ? (
        <p className="text-sm text-muted">All staff are already in this chat.</p>
      ) : (
        <>
          <Select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            {available.map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {member.full_name}
              </option>
            ))}
          </Select>
          <FormActions>
            <Button type="submit" loading={pending} loadingLabel="Adding…" disabled={!selectedUserId}>
              Add staff
            </Button>
          </FormActions>
        </>
      )}
    </form>
  );
}
