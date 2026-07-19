import { redirect } from 'next/navigation';
import { getProviderSession } from '@/lib/auth';
import { AppShell } from '@/components/app-shell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getProviderSession();
  if (!session) {
    redirect('/login');
  }

  return (
    <AppShell
      email={session.user.email ?? 'provider'}
      role={session.activeRole}
      organizationName={session.activeOrganizationName}
    >
      {children}
    </AppShell>
  );
}
