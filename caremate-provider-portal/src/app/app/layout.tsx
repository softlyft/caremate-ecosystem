import { redirect } from 'next/navigation';
import { getProviderSession } from '@/lib/auth';
import { getEnabledModules } from '@/domains/modules/repository';
import { AppShell } from '@/components/app-shell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getProviderSession();
  if (!session) {
    redirect('/login');
  }

  const enabled = await getEnabledModules(session.activeOrganizationId);

  return (
    <AppShell
      email={session.user.email ?? 'provider'}
      role={session.activeRole}
      organizationName={session.activeOrganizationName}
      enabledModules={[...enabled]}
    >
      {children}
    </AppShell>
  );
}
