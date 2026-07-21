'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { archiveProvider } from '@/domains/providers/actions';
import { Button } from '@/components/ui/button';

export function ArchiveProviderButton({ providerId }: { providerId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      loading={pending}
      loadingLabel="Archiving…"
      onClick={() => {
        start(async () => {
          try {
            await archiveProvider(providerId);
            toast.success('Provider archived');
            router.push('/dashboard/providers');
            router.refresh();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Archive failed');
          }
        });
      }}
    >
      Archive provider
    </Button>
  );
}
