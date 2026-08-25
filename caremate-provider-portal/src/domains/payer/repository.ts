import { createClient } from '@/lib/supabase/server';
import type { PayerOrganization, PayerProfile } from '@/types/database';

export type PayerOrgWithProfile = {
  organization: PayerOrganization;
  profile: PayerProfile | null;
};

/** Form defaults: profile overlay wins, then catalog row. */
export type PayerEditableDetails = {
  description: string | null;
  website: string | null;
  logo_url: string | null;
  phone: string | null;
  address: string | null;
  email: string | null;
};

export function resolvePayerEditableDetails(
  organization: PayerOrganization,
  profile: PayerProfile | null,
): PayerEditableDetails {
  return {
    description: profile?.description ?? null,
    logo_url: profile?.logo_url ?? null,
    website: profile?.website ?? organization.website ?? null,
    phone: profile?.phone ?? organization.phone ?? null,
    address: profile?.address ?? organization.address ?? null,
    email: organization.email ?? profile?.email ?? null,
  };
}

export async function getPayerOrganizationProfile(
  organizationId: string,
): Promise<PayerOrgWithProfile | null> {
  const supabase = await createClient();

  const [{ data: organization, error: orgError }, { data: profile, error: profileError }] =
    await Promise.all([
      supabase.from('payer_organizations').select('*').eq('id', organizationId).maybeSingle(),
      supabase.from('payer_profiles').select('*').eq('organization_id', organizationId).maybeSingle(),
    ]);

  if (orgError) throw orgError;
  if (profileError) throw profileError;
  if (!organization) return null;

  return {
    organization: organization as PayerOrganization,
    profile: (profile as PayerProfile | null) ?? null,
  };
}

export async function updatePayerOrganizationDetails(
  organizationId: string,
  input: {
    description: string | null;
    website: string | null;
    logo_url: string | null;
    phone: string | null;
    address: string | null;
  },
): Promise<{ organization: PayerOrganization; profile: PayerProfile }> {
  const supabase = await createClient();
  const ts = new Date().toISOString();

  const { data: organization, error: orgError } = await supabase
    .from('payer_organizations')
    .update({
      phone: input.phone,
      website: input.website,
      address: input.address,
      updated_at: ts,
    })
    .eq('id', organizationId)
    .is('deleted_at', null)
    .select('*')
    .single();

  if (orgError) throw orgError;

  const { data: existing } = await supabase
    .from('payer_profiles')
    .select('id')
    .eq('organization_id', organizationId)
    .maybeSingle();

  let profile: PayerProfile;
  if (existing) {
    const { data, error } = await supabase
      .from('payer_profiles')
      .update({
        description: input.description,
        website: input.website,
        logo_url: input.logo_url,
        phone: input.phone,
        address: input.address,
        updated_at: ts,
      })
      .eq('organization_id', organizationId)
      .select('*')
      .single();
    if (error) throw error;
    profile = data as PayerProfile;
  } else {
    const { data, error } = await supabase
      .from('payer_profiles')
      .insert({
        organization_id: organizationId,
        description: input.description,
        website: input.website,
        logo_url: input.logo_url,
        phone: input.phone,
        address: input.address,
        email: organization.email,
        verification_status: 'verified',
        updated_at: ts,
      })
      .select('*')
      .single();
    if (error) throw error;
    profile = data as PayerProfile;
  }

  return {
    organization: organization as PayerOrganization,
    profile,
  };
}
