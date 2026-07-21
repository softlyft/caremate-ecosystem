import { redirect } from 'next/navigation';
import { getCommunitySession } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const session = await getCommunitySession();
  if (session) {
    redirect('/app/dashboard');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? '/join' : '/login');
}
