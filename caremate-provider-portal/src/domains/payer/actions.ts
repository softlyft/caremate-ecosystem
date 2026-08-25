'use server';

import { revalidatePath } from 'next/cache';

import { requirePayerManageAccess } from '@/lib/auth';
import { updatePayerOrganizationDetails } from '@/domains/payer/repository';

function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function updatePayerOrgProfileAction(formData: FormData): Promise<void> {
  const session = await requirePayerManageAccess();

  await updatePayerOrganizationDetails(session.activeOrganizationId, {
    description: emptyToNull(formData.get('description')),
    website: emptyToNull(formData.get('website')),
    logo_url: emptyToNull(formData.get('logo_url')),
    phone: emptyToNull(formData.get('phone')),
    address: emptyToNull(formData.get('address')),
  });

  revalidatePath('/payer/organization');
  revalidatePath('/payer/dashboard');
}
