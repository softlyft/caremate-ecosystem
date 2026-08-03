'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireManageAccess } from '@/lib/auth';
import { isProviderModuleKey } from '@/domains/modules/catalog';
import { setModuleEnabled } from '@/domains/modules/repository';

const toggleSchema = z.object({
  moduleKey: z.string().refine(isProviderModuleKey, 'Invalid module'),
  enabled: z.enum(['true', 'false']),
});

export async function toggleModuleAction(formData: FormData) {
  const session = await requireManageAccess();
  const parsed = toggleSchema.parse({
    moduleKey: formData.get('moduleKey'),
    enabled: formData.get('enabled'),
  });

  await setModuleEnabled({
    organizationId: session.activeOrganizationId,
    moduleKey: parsed.moduleKey,
    enabled: parsed.enabled === 'true',
    userId: session.user.id,
  });

  revalidatePath('/app/settings');
  revalidatePath('/app/settings/modules');
  revalidatePath('/app', 'layout');
}
