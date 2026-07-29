'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  archiveLocationAction,
  archiveOrganizationAction,
  archiveServiceAction,
} from '@/domains/providers/actions';

export function ArchiveOrganizationButton({ organizationId }: { organizationId: string }) {
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
            'Archive this organization and its locations? Nearby pins will be deactivated.',
          )
        ) {
          return;
        }
        startTransition(async () => {
          try {
            await archiveOrganizationAction(organizationId);
            toast.success('Organization archived');
            router.push('/dashboard/providers?view=organizations');
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

export function ArchiveLocationButton({
  locationId,
  organizationId,
}: {
  locationId: string;
  organizationId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      loading={pending}
      onClick={() => {
        if (!window.confirm('Archive this location? Nearby pin will be deactivated.')) return;
        startTransition(async () => {
          try {
            await archiveLocationAction(locationId);
            toast.success('Location archived');
            router.push(`/dashboard/providers/organizations/${organizationId}`);
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

export function ArchiveServiceButton({
  serviceId,
  organizationId,
  locationId,
}: {
  serviceId: string;
  organizationId: string;
  locationId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      loading={pending}
      onClick={() => {
        if (!window.confirm('Archive this healthcare service?')) return;
        startTransition(async () => {
          try {
            await archiveServiceAction(serviceId);
            toast.success('Service archived');
            router.push(
              `/dashboard/providers/organizations/${organizationId}/locations/${locationId}`,
            );
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
