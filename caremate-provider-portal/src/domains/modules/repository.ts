import { createClient } from '@/lib/supabase/server';
import {
  PROVIDER_MODULES,
  resolveEnabledModules,
  type ProviderModuleKey,
} from '@/domains/modules/catalog';

export type OrgModuleOverride = {
  id: string;
  organization_id: string;
  module_key: string;
  enabled: boolean;
  enabled_at: string | null;
  enabled_by: string | null;
};

export async function listOrgModuleOverrides(
  organizationId: string,
): Promise<OrgModuleOverride[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('provider_org_modules')
    .select('*')
    .eq('organization_id', organizationId);

  if (error) throw error;
  return (data ?? []) as OrgModuleOverride[];
}

export async function getEnabledModules(
  organizationId: string,
): Promise<Set<ProviderModuleKey>> {
  const overrides = await listOrgModuleOverrides(organizationId);
  return resolveEnabledModules(
    overrides.map((o) => ({ module_key: o.module_key, enabled: o.enabled })),
  );
}

export async function setModuleEnabled(input: {
  organizationId: string;
  moduleKey: ProviderModuleKey;
  enabled: boolean;
  userId: string;
}): Promise<void> {
  const def = PROVIDER_MODULES.find((m) => m.key === input.moduleKey);
  if (!def?.activatable) {
    throw new Error('This module cannot be toggled from Settings');
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase.from('provider_org_modules').upsert(
    {
      organization_id: input.organizationId,
      module_key: input.moduleKey,
      enabled: input.enabled,
      enabled_at: input.enabled ? now : null,
      enabled_by: input.enabled ? input.userId : null,
      updated_at: now,
    },
    { onConflict: 'organization_id,module_key' },
  );

  if (error) throw error;
}
