'use client';

import { useTransition } from 'react';
import { toggleModuleAction } from '@/domains/modules/actions';
import type { ProviderModuleKey } from '@/domains/modules/catalog';
import { Button } from '@/components/ui/button';

export function ModuleToggleForm({
  moduleKey,
  enabled,
}: {
  moduleKey: ProviderModuleKey;
  enabled: boolean;
}) {
  const [pending, start] = useTransition();

  return (
    <form
      action={(fd) => {
        start(async () => {
          await toggleModuleAction(fd);
        });
      }}
    >
      <input type="hidden" name="moduleKey" value={moduleKey} />
      <input type="hidden" name="enabled" value={enabled ? 'false' : 'true'} />
      <Button type="submit" variant={enabled ? 'secondary' : 'default'} loading={pending}>
        {enabled ? 'Deactivate' : 'Activate'}
      </Button>
    </form>
  );
}
