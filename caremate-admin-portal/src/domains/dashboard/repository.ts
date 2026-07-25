import { createClient } from '@/lib/supabase/server';
import { listAllAuthUsers } from '@/lib/list-auth-users';

export async function getOverviewMetrics() {
  const supabase = await createClient();

  const [{ count: articleCount }, { count: providerCount }, { count: tipCount }, allUsers] =
    await Promise.all([
      supabase.from('articles').select('*', { count: 'exact', head: true }),
      supabase.from('providers').select('*', { count: 'exact', head: true }),
      supabase.from('health_tips').select('*', { count: 'exact', head: true }),
      listAllAuthUsers(),
    ]);

  return {
    userCount: allUsers.length,
    articleCount: articleCount ?? 0,
    providerCount: providerCount ?? 0,
    tipCount: tipCount ?? 0,
    recentUsers: allUsers
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
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
