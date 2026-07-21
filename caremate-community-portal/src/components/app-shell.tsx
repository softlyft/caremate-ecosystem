'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Award,
  FolderOpen,
  UserRound,
  Shield,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/browser';
import { ROLE_LABELS } from '@/constants/roles';
import type { MembershipRole } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/notification-bell';

const NAV_ITEMS = [
  { href: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/community', label: 'Community', icon: Users },
  { href: '/app/events', label: 'Events', icon: CalendarDays },
  { href: '/app/recognition', label: 'Recognition', icon: Award },
  { href: '/app/resources', label: 'Resources', icon: FolderOpen },
  { href: '/app/profile', label: 'Profile', icon: UserRound },
] as const;

export function AppShell({
  children,
  email,
  role,
  chapterName,
  isLeader,
  unreadCount = 0,
}: {
  children: React.ReactNode;
  email: string;
  role: MembershipRole;
  chapterName: string;
  isLeader: boolean;
  unreadCount?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, startSignOut] = useTransition();

  const signOut = () => {
    startSignOut(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace('/login');
      router.refresh();
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <aside className="sticky top-0 z-20 flex w-full shrink-0 flex-col border-b border-border bg-surface md:h-screen md:w-64 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-3 px-4 py-4 md:px-5 md:py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-border bg-white shadow-sm md:h-11 md:w-11">
              <Image
                src="/brand/caremate-icon.png"
                alt="CareMate"
                width={40}
                height={40}
                className="h-8 w-8 object-contain md:h-9 md:w-9"
                priority
              />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="text-sm font-semibold tracking-tight text-brand-navy">CareMate</p>
              <p className="truncate text-xs text-muted">Community Portal</p>
            </div>
          </div>
          <div className="md:hidden">
            <NotificationBell initialCount={unreadCount} />
          </div>
        </div>

        <div className="mx-4 mb-2 hidden rounded-lg bg-primary-light/60 px-3 py-2 md:block">
          <p className="truncate text-xs font-medium text-primary-dark">{chapterName}</p>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:gap-1 md:overflow-y-auto md:py-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href ||
              (href !== '/app/dashboard' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'relative flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all md:gap-3',
                  active
                    ? 'bg-primary-light text-primary-dark'
                    : 'text-muted hover:bg-surface-muted hover:text-foreground',
                )}
              >
                <Icon className={cn('h-4 w-4', active ? 'text-primary' : '')} />
                <span>{label}</span>
              </Link>
            );
          })}

          {isLeader && (
            <Link
              href="/app/leader"
              className={cn(
                'relative flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all md:mt-3 md:gap-3',
                pathname.startsWith('/app/leader') || pathname.startsWith('/app/events/manage')
                  ? 'bg-primary-light text-primary-dark'
                  : 'text-muted hover:bg-surface-muted hover:text-foreground',
              )}
            >
              <Shield className="h-4 w-4" />
              Leader
            </Link>
          )}
        </nav>

        <div className="hidden border-t border-border p-4 md:block">
          <div className="mb-3 flex items-center justify-between">
            <NotificationBell initialCount={unreadCount} />
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-surface-muted p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold uppercase text-white">
              {email.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{email}</p>
              <Badge className="mt-0.5" variant="secondary">
                {ROLE_LABELS[role]}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-start text-muted hover:text-foreground"
            loading={signingOut}
            loadingLabel="Signing out…"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">{children}</div>
      </main>
    </div>
  );
}
