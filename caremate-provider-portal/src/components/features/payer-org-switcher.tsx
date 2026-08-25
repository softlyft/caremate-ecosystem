'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  switchActivePayerOrganizationAction,
  switchCareWorkspaceKindAction,
} from '@/domains/org/actions';
import { PROVIDER_ROLE_LABELS } from '@/constants/roles';
import type { PayerMembership } from '@/lib/auth';

export function PayerOrgSwitcher({
  memberships,
  activeOrganizationId,
}: {
  memberships: PayerMembership[];
  activeOrganizationId: string;
}) {
  const [pending, startTransition] = useTransition();

  if (memberships.length <= 1) {
    return (
      <p className="text-sm text-muted">
        You belong to one payer organization. Ask a CareMate admin to add more memberships if
        needed.
      </p>
    );
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
            await switchActivePayerOrganizationAction(orgId);
            toast.success('Active organization updated');
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Switch failed');
          }
        });
      }}
    >
      <div className="min-w-[240px] space-y-2">
        <Label htmlFor="payer_organization_id">Active organization</Label>
        <Select
          id="payer_organization_id"
          name="organization_id"
          defaultValue={activeOrganizationId}
        >
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

export function WorkspaceKindSwitcher({
  hasProvider,
  hasPayer,
  currentKind,
}: {
  hasProvider: boolean;
  hasPayer: boolean;
  currentKind: 'provider' | 'payer';
}) {
  const [pending, startTransition] = useTransition();

  if (!(hasProvider && hasPayer)) {
    return null;
  }

  const otherKind = currentKind === 'provider' ? 'payer' : 'provider';
  const label =
    otherKind === 'payer' ? 'Switch to payer workspace' : 'Switch to provider workspace';

  return (
    <Button
      type="button"
      variant="secondary"
      loading={pending}
      loadingLabel="Switching…"
      onClick={() => {
        startTransition(async () => {
          try {
            await switchCareWorkspaceKindAction(otherKind);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Switch failed');
          }
        });
      }}
    >
      {label}
    </Button>
  );
}
