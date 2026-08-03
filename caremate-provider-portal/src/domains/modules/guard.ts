import { redirect } from 'next/navigation';
import {
  isModuleEnabled,
  moduleKeyForPath,
  type ProviderModuleKey,
} from '@/domains/modules/catalog';
import { getEnabledModules } from '@/domains/modules/repository';
import { requireProviderSession } from '@/lib/auth';

export async function requireModule(moduleKey: ProviderModuleKey): Promise<void> {
  const session = await requireProviderSession();
  const enabled = await getEnabledModules(session.activeOrganizationId);
  if (!isModuleEnabled(enabled, moduleKey)) {
    redirect('/app/settings/modules');
  }
}

export async function assertPathModuleEnabled(pathname: string): Promise<void> {
  const key = moduleKeyForPath(pathname);
  if (!key) return;
  await requireModule(key);
}
