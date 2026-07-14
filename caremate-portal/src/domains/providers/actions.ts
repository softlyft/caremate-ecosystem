'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requirePortalSession } from '@/lib/auth';
import { canEditCatalog } from '@/constants/roles';
import { writeAuditEvent } from '@/lib/audit';
import type { Json } from '@/types/database';

async function requireEditor() {
  const session = await requirePortalSession();
  if (!canEditCatalog(session.role)) throw new Error('Forbidden');
  return session;
}

export type ProviderInput = {
  id?: string;
  name: string;
  type: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distance_km?: number | null;
  attributes?: Json;
};

export async function saveProvider(input: ProviderInput) {
  await requireEditor();
  const supabase = await createClient();
  const id = input.id ?? crypto.randomUUID();
  const now = new Date().toISOString();

  const row = {
    id,
    name: input.name,
    type: input.type,
    address: input.address ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    distance_km: input.distance_km ?? null,
    attributes: input.attributes ?? {},
    updated_at: now,
    ...(input.id ? {} : { created_at: now }),
  };

  const { error } = await supabase.from('providers').upsert(row);
  if (error) throw error;

  await writeAuditEvent({
    action: input.id ? 'update_provider' : 'create_provider',
    entityType: 'provider',
    entityId: id,
    payload: { name: input.name },
  });

  revalidatePath('/dashboard/providers');
  revalidatePath(`/dashboard/providers/${id}`);
  return id;
}

export async function deleteProvider(id: string) {
  await requireEditor();
  const supabase = await createClient();
  const { error } = await supabase.from('providers').delete().eq('id', id);
  if (error) throw error;
  await writeAuditEvent({ action: 'delete_provider', entityType: 'provider', entityId: id });
  revalidatePath('/dashboard/providers');
}
