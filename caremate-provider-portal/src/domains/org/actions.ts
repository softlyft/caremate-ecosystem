'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { requireManageAccess, requireProviderSession } from '@/lib/auth';
import { ACTIVE_ORG_COOKIE } from '@/constants/cookies';
import { ORG_TYPES } from '@/constants/org-types';
import { updateOrganizationProfile } from '@/domains/org/repository';
import type { Json } from '@/types/database';

const updateSchema = z.object({
  description: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  logo_url: z.string().optional().nullable(),
  emergency_contact: z.string().optional().nullable(),
  organization_type: z.enum(ORG_TYPES),
  opening_hours_text: z.string().optional().nullable(),
});

export async function updateOrgProfileAction(formData: FormData) {
  const session = await requireManageAccess();

  const parsed = updateSchema.parse({
    description: formData.get('description') || null,
    website: formData.get('website') || null,
    logo_url: formData.get('logo_url') || null,
    emergency_contact: formData.get('emergency_contact') || null,
    organization_type: formData.get('organization_type'),
    opening_hours_text: formData.get('opening_hours_text') || null,
  });

  let opening_hours: Json = {};
  if (parsed.opening_hours_text?.trim()) {
    try {
      opening_hours = JSON.parse(parsed.opening_hours_text) as Json;
    } catch {
      opening_hours = { notes: parsed.opening_hours_text };
    }
  }

  await updateOrganizationProfile(session.activeOrganizationId, {
    description: parsed.description,
    website: parsed.website,
    logo_url: parsed.logo_url,
    emergency_contact: parsed.emergency_contact,
    organization_type: parsed.organization_type,
    opening_hours,
  });

  revalidatePath('/app/organization');
  revalidatePath('/app/dashboard');
}

export async function switchActiveOrganizationAction(organizationId: string) {
  const session = await requireProviderSession();
  const allowed = session.memberships.some((m) => m.organizationId === organizationId);
  if (!allowed) throw new Error('Not a member of that organization');

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, organizationId, {
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath('/app');
}
