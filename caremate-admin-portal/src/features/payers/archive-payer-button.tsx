'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { archivePayerOrganizationAction } from '@/domains/payers/actions';

export function ArchivePayerOrganizationButton({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      loading={pending}
      onClick={() => {
        if (
          !window.confirm(
            'Archive this health insurance organization? It will no longer appear for Care Portal claim.',
          )
        ) {
          return;
        }
        startTransition(async () => {
          try {
            await archivePayerOrganizationAction(organizationId);
            toast.success('Organization archived');
            router.push('/dashboard/payers');
            router.refresh();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Archive failed');
          }
        });
      }}
    >
      Archive organization
    </Button>
  );
}
