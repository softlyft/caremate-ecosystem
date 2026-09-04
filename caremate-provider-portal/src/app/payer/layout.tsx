import { redirect } from 'next/navigation';
import { getPayerSession } from '@/lib/auth';
import { getPayerNavBadges } from '@/lib/nav-badges';
import { PayerAppShell } from '@/components/payer-app-shell';

export default async function PayerLayout({ children }: { children: React.ReactNode }) {
  const session = await getPayerSession();
  if (!session) {
    redirect('/login');
  }

  const navBadges = await getPayerNavBadges(session.activeOrganizationId);

  return (
    <PayerAppShell
      email={session.user.email ?? 'payer'}
      role={session.activeRole}
      organizationName={session.activeOrganizationName}
      navBadges={navBadges}
    >
      {children}
    </PayerAppShell>
  );
}
