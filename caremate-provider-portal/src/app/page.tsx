import { redirect } from 'next/navigation';
import { getProviderSession } from '@/lib/auth';

export default async function HomePage() {
  const session = await getProviderSession();
  redirect(session ? '/app/dashboard' : '/claim');
}
