'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PROVIDER_ROLE_LABELS } from '@/constants/roles';
import type { ProviderMemberRole } from '@/types/database';

export type OrgMembershipOption = {
  organizationId: string;
  organizationName: string;
  role: ProviderMemberRole;
};

export function OrgMembershipSwitcher({
  memberships,
  activeOrganizationId,
  switchAction,
  emptyMessage,
  selectId = 'organization_id',
}: {
  memberships: OrgMembershipOption[];
  activeOrganizationId: string;
  switchAction: (organizationId: string) => Promise<void>;
  emptyMessage: string;
  selectId?: string;
}) {
  const [pending, startTransition] = useTransition();

  if (memberships.length <= 1) {
    return <p className="text-sm text-muted">{emptyMessage}</p>;
  }

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const orgId = String(formData.get('organization_id') || '');
        startTransition(async () => {
          try {
            await switchAction(orgId);
            toast.success('Active organization updated');
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Switch failed');
          }
        });
      }}
    >
      <div className="min-w-[240px] space-y-2">
        <Label htmlFor={selectId}>Active organization</Label>
        <Select id={selectId} name="organization_id" defaultValue={activeOrganizationId}>
          {memberships.map((m) => (
            <option key={m.organizationId} value={m.organizationId}>
              {m.organizationName} ({PROVIDER_ROLE_LABELS[m.role]})
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" loading={pending} loadingLabel="Switching…">
        Switch
      </Button>
    </form>
  );
}
