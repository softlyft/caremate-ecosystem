import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function getOverviewMetrics() {
  const admin = createAdminClient();
  const supabase = await createClient();

  const [
    { count: articleCount },
    { count: providerCount },
    { count: tipCount },
    { data: authData },
  ] = await Promise.all([
    supabase.from('articles').select('*', { count: 'exact', head: true }),
    supabase.from('providers').select('*', { count: 'exact', head: true }),
    supabase.from('health_tips').select('*', { count: 'exact', head: true }),
    admin.auth.admin.listUsers({ page: 1, perPage: 1 }),
  ]);

  const userCount = authData?.users ? (authData as { users: unknown[] }).users.length : 0;
  // listUsers doesn't return total — fetch a larger page for count estimate
  const { data: allUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

  return {
    userCount: allUsers?.users?.length ?? userCount,
    articleCount: articleCount ?? 0,
    providerCount: providerCount ?? 0,
    tipCount: tipCount ?? 0,
    recentUsers: (allUsers?.users ?? [])
      .slice()
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 5)
      .map((u) => ({
        id: u.id,
        email: u.email ?? '—',
        createdAt: u.created_at,
        role: (u.app_metadata?.role as string | undefined) ?? null,
        banned: Boolean(u.banned_until),
      })),
  };
}
