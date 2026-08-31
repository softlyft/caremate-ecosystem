'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { switchCareWorkspaceKindAction } from '@/domains/org/actions';

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
