'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requirePortalSession } from '@/lib/auth';
import { canEditCatalog } from '@/constants/roles';
import { writeAuditEvent } from '@/lib/audit';
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit-catalog';
import {
  createPayerOrganization,
  getPayerOrganization,
  softDeletePayerOrganization,
  updatePayerOrganization,
} from '@/domains/payers/repository';

async function requireEditor() {
  const session = await requirePortalSession();
  if (!canEditCatalog(session.role)) throw new Error('Forbidden');
  return session;
}

const optionalEmail = z
  .string()
  .trim()
  .transform((v) => (v.length ? v : null))
  .pipe(z.union([z.string().email(), z.null()]));

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v.length ? v : null));

const payerOrganizationSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: optionalEmail,
  phone: optionalText,
  website: optionalText,
  address: optionalText,
  active: z.enum(['true', 'false']).default('true'),
});

function revalidatePayerPaths(organizationId?: string) {
  revalidatePath('/dashboard/payers');
  if (organizationId) {
    revalidatePath(`/dashboard/payers/${organizationId}`);
  }
}

export async function createPayerOrganizationAction(formData: FormData) {
  await requireEditor();
  const parsed = payerOrganizationSchema.parse({
    name: formData.get('name'),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    website: String(formData.get('website') ?? ''),
    address: String(formData.get('address') ?? ''),
    active: formData.get('active') || 'true',
  });
  const org = await createPayerOrganization({
    name: parsed.name,
    email: parsed.email,
    phone: parsed.phone,
    website: parsed.website,
    address: parsed.address,
    active: parsed.active === 'true',
  });
  await writeAuditEvent({
    action: AUDIT_ACTION.createPayerOrganization,
    entityType: AUDIT_ENTITY.payerOrganization,
    entityId: org.id,
    payload: { name: org.name, email: org.email },
  });
  revalidatePayerPaths(org.id);
  return { id: org.id };
}

export async function updatePayerOrganizationAction(organizationId: string, formData: FormData) {
  await requireEditor();
  const existing = await getPayerOrganization(organizationId);
  if (!existing || existing.deleted_at) throw new Error('Organization not found');

  const parsed = payerOrganizationSchema.parse({
    name: formData.get('name'),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    website: String(formData.get('website') ?? ''),
    address: String(formData.get('address') ?? ''),
    active: formData.get('active') || 'true',
  });
  await updatePayerOrganization(organizationId, {
    name: parsed.name,
    email: parsed.email,
    phone: parsed.phone,
    website: parsed.website,
    address: parsed.address,
    active: parsed.active === 'true',
  });
  await writeAuditEvent({
    action: AUDIT_ACTION.updatePayerOrganization,
    entityType: AUDIT_ENTITY.payerOrganization,
    entityId: organizationId,
  });
  revalidatePayerPaths(organizationId);
}

export async function archivePayerOrganizationAction(organizationId: string) {
  await requireEditor();
  const existing = await getPayerOrganization(organizationId);
  if (!existing || existing.deleted_at) throw new Error('Organization not found');

  await softDeletePayerOrganization(organizationId);
  await writeAuditEvent({
    action: AUDIT_ACTION.archivePayerOrganization,
    entityType: AUDIT_ENTITY.payerOrganization,
    entityId: organizationId,
  });
  revalidatePayerPaths(organizationId);
}
