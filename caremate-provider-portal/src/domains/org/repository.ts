import { createClient } from '@/lib/supabase/server';
import type { Json, ProviderOrganization, ProviderProfile } from '@/types/database';

export type OrgWithProfile = {
  organization: ProviderOrganization;
  profile: ProviderProfile | null;
};

export async function getOrganizationProfile(
  organizationId: string,
): Promise<OrgWithProfile | null> {
  const supabase = await createClient();

  const [{ data: organization, error: orgError }, { data: profile, error: profileError }] =
    await Promise.all([
      supabase.from('provider_organizations').select('*').eq('id', organizationId).maybeSingle(),
      supabase.from('provider_profiles').select('*').eq('organization_id', organizationId).maybeSingle(),
    ]);

  if (orgError) throw orgError;
  if (profileError) throw profileError;
  if (!organization) return null;

  return {
    organization: organization as ProviderOrganization,
    profile: (profile as ProviderProfile | null) ?? null,
  };
}

export async function updateOrganizationProfile(
  organizationId: string,
  input: Partial<{
    description: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    logo_url: string | null;
    address: string | null;
    opening_hours: Json;
    emergency_contact: string | null;
    services_offered: string[];
    organization_type: ProviderProfile['organization_type'];
  }>,
): Promise<ProviderProfile> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('provider_profiles')
    .select('id')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('provider_profiles')
      .update(input)
      .eq('organization_id', organizationId)
      .select('*')
      .single();
    if (error) throw error;
    return data as ProviderProfile;
  }

  const { data, error } = await supabase
    .from('provider_profiles')
    .insert({
      organization_id: organizationId,
      ...input,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as ProviderProfile;
}
