import { redirect } from 'next/navigation';
import { getPortalSession } from '@/lib/auth';

export default async function HomePage() {
  const session = await getPortalSession();
  redirect(session ? '/dashboard' : '/login');
}
