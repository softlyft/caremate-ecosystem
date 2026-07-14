import { redirect } from 'next/navigation';
import { getPortalSession } from '@/lib/auth';
import { DashboardShell } from '@/components/dashboard-shell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getPortalSession();
  if (!session) {
    redirect('/login');
  }

  return (
    <DashboardShell email={session.user.email ?? 'staff'} role={session.role}>
      {children}
    </DashboardShell>
  );
}
