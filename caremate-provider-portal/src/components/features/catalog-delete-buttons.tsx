'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  softDeleteLocationAction,
  softDeleteServiceAction,
} from '@/domains/catalog/actions';

export function SoftDeleteLocationButton({ locationId }: { locationId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="danger"
      size="sm"
      loading={pending}
      onClick={() => {
        if (!window.confirm('Archive this location? Nearby pin will be deactivated.')) return;
        startTransition(async () => {
          try {
            await softDeleteLocationAction(locationId);
            toast.success('Location archived');
            router.push('/app/organization');
            router.refresh();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Archive failed');
          }
        });
      }}
    >
      Archive location
    </Button>
  );
}

export function SoftDeleteServiceButton({ serviceId }: { serviceId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="danger"
      size="sm"
      loading={pending}
      onClick={() => {
        if (!window.confirm('Archive this healthcare service?')) return;
        startTransition(async () => {
          try {
            const result = await softDeleteServiceAction(serviceId);
            toast.success('Service archived');
            if (result.locationId) {
              router.push(`/app/organization/locations/${result.locationId}`);
            } else {
              router.push('/app/organization');
            }
            router.refresh();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Archive failed');
          }
        });
      }}
    >
      Archive service
    </Button>
  );
}
