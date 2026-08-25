import { redirect } from 'next/navigation';
import { getCareSession } from '@/lib/auth';

export default async function HomePage() {
  const session = await getCareSession();
  redirect(session ? session.homePath : '/claim');
}
