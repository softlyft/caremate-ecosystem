export type LocalAccountIdentity = {
  userId: string;
  email?: string | null;
  fullName?: string | null;
  phone?: string | null;
};

function readMetaString(meta: Record<string, unknown> | undefined, key: string): string | null {
  const value = meta?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** Pull display identity from a Supabase auth user (metadata + email/phone). */
export function identityFromAuthUser(user: {
  id: string;
  email?: string | null;
  phone?: string | null;
  user_metadata?: Record<string, unknown>;
}): LocalAccountIdentity {
  const meta = user.user_metadata;
  return {
    userId: user.id,
    email: user.email?.trim() || null,
    fullName: readMetaString(meta, 'full_name') ?? '',
    phone: readMetaString(meta, 'phone') ?? user.phone?.trim() ?? null,
  };
}
