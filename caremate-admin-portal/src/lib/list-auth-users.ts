import type { User } from '@supabase/supabase-js';

import { createAdminClient } from '@/lib/supabase/admin';

const PAGE_SIZE = 200;
const MAX_PAGES = 50;

/** Paginate Auth Admin listUsers (avoids silent truncation at 1000). */
export async function listAllAuthUsers(): Promise<User[]> {
  const admin = createAdminClient();
  const users: User[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE,
    });
    if (error) throw error;

    const batch = data.users ?? [];
    users.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }

  return users;
}
