import { redirect } from 'next/navigation';
import { getCommunitySession } from '@/lib/auth';
import { AppShell } from '@/components/app-shell';
import { listUnread } from '@/domains/notifications/repository';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getCommunitySession();
  if (!session) {
    redirect('/login');
  }

  const unread = await listUnread(session.user.id);

  return (
    <AppShell
      email={session.user.email ?? 'member'}
      role={session.activeRole}
      chapterName={session.activeChapterName}
      isLeader={session.isLeader}
      unreadCount={unread.length}
    >
      {children}
    </AppShell>
  );
}
