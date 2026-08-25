import { redirect } from 'next/navigation';
import { getPayerSession } from '@/lib/auth';
import { PayerAppShell } from '@/components/payer-app-shell';

export default async function PayerLayout({ children }: { children: React.ReactNode }) {
  const session = await getPayerSession();
  if (!session) {
    redirect('/login');
  }

  return (
    <PayerAppShell
      email={session.user.email ?? 'payer'}
      role={session.activeRole}
      organizationName={session.activeOrganizationName}
    >
      {children}
    </PayerAppShell>
  );
}
