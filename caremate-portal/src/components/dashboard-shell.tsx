'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  MapPin,
  Lightbulb,
  LogOut,
  HeartPulse,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/browser';
import { useAuthStore } from '@/features/auth/store';
import { STAFF_ROLE_LABELS, type StaffRole } from '@/constants/roles';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/users', label: 'Users', icon: Users },
  { href: '/dashboard/learn', label: 'Learn', icon: BookOpen },
  { href: '/dashboard/providers', label: 'Providers', icon: MapPin },
  { href: '/dashboard/tips', label: 'Health Tips', icon: Lightbulb },
] as const;

export function DashboardShell({
  children,
  email,
  role,
}: {
  children: React.ReactNode;
  email: string;
  role: StaffRole;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const clear = useAuthStore((s) => s.clear);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    clear();
    router.replace('/login');
    router.refresh();
  };

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-white">
        <div className="flex items-center gap-2 border-b border-border px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-light">
            <HeartPulse className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">CareMate</p>
            <p className="text-xs text-muted">Admin Portal</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary-light text-primary-dark'
                    : 'text-muted hover:bg-surface hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-4">
          <p className="truncate text-sm font-medium">{email}</p>
          <Badge className="mt-1" variant="secondary">
            {STAFF_ROLE_LABELS[role]}
          </Badge>
          <Button variant="ghost" size="sm" className="mt-3 w-full justify-start" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
