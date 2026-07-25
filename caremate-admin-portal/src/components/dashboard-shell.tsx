'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  MapPin,
  Lightbulb,
  Newspaper,
  CreditCard,
  LogOut,
  Megaphone,
  ScrollText,
  Building2,
  Calendar,
  FolderOpen,
  Award,
  BarChart3,
  UsersRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/browser';
import { useAuthStore } from '@/features/auth/store';
import {
  canEditCatalog,
  canManageBilling,
  canManageCommunity,
  canManageUsers,
  canViewAuditLogs,
  STAFF_ROLE_LABELS,
  type StaffRole,
} from '@/constants/roles';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };

const NAV_GROUPS: {
  label: string;
  items: NavItem[];
  visible?: (role: StaffRole) => boolean;
}[] = [
  {
    label: 'General',
    items: [{ href: '/dashboard', label: 'Overview', icon: LayoutDashboard }],
  },
  {
    label: 'Catalog',
    visible: canEditCatalog,
    items: [
      { href: '/dashboard/learn', label: 'Learn', icon: BookOpen },
      { href: '/dashboard/news', label: 'External News', icon: Newspaper },
      { href: '/dashboard/providers', label: 'Providers', icon: MapPin },
      { href: '/dashboard/tips', label: 'Health Tips', icon: Lightbulb },
    ],
  },
  {
    label: 'Community',
    visible: canManageCommunity,
    items: [
      { href: '/dashboard/community', label: 'Overview', icon: UsersRound },
      { href: '/dashboard/community/profiles', label: 'Profiles', icon: Users },
      { href: '/dashboard/community/chapters', label: 'Chapters', icon: Building2 },
      {
        href: '/dashboard/community/chapters/requests',
        label: 'Chapter requests',
        icon: Building2,
      },
      { href: '/dashboard/community/events', label: 'Events', icon: Calendar },
      { href: '/dashboard/community/resources', label: 'Resources', icon: FolderOpen },
      { href: '/dashboard/community/recognition', label: 'Recognition', icon: Award },
      { href: '/dashboard/community/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Growth',
    items: [],
  },
];

function growthItemsForRole(role: StaffRole): NavItem[] {
  const items: NavItem[] = [];
  if (canManageUsers(role)) {
    items.push({ href: '/dashboard/users', label: 'Users', icon: Users });
  }
  if (canEditCatalog(role)) {
    items.push({ href: '/dashboard/ads', label: 'Ads', icon: Megaphone });
  }
  if (canManageBilling(role)) {
    items.push({ href: '/dashboard/billing', label: 'Billing', icon: CreditCard });
  }
  if (canViewAuditLogs(role)) {
    items.push({ href: '/dashboard/audit', label: 'Audit logs', icon: ScrollText });
  }
  return items;
}

function navGroupsForRole(role: StaffRole) {
  return NAV_GROUPS.map((group) => {
    if (group.label === 'Growth') {
      return { ...group, items: growthItemsForRole(role) };
    }
    return group;
  }).filter((group) => {
    if (group.visible && !group.visible(role)) return false;
    return group.items.length > 0;
  });
}

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
  const [signingOut, startSignOut] = useTransition();

  const signOut = () => {
    startSignOut(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      clear();
      router.replace('/login');
      router.refresh();
    });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-border bg-surface">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-border bg-white shadow-sm">
            <Image
              src="/brand/caremate-icon.png"
              alt="CareMate"
              width={40}
              height={40}
              className="h-9 w-9 object-contain"
              priority
            />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight text-brand-navy">CareMate</p>
            <p className="text-xs text-muted">Admin Portal</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
          {navGroupsForRole(role).map((group) => (
            <div key={group.label} className="flex flex-col gap-1">
              <p className="px-3 pb-1 text-[0.68rem] font-semibold uppercase tracking-wider text-muted/70">
                {group.label}
              </p>
              {group.items.map(({ href, label, icon: Icon }) => {
                const exactOnly =
                  href === '/dashboard' || href === '/dashboard/community';
                const active =
                  pathname === href ||
                  (!exactOnly && pathname.startsWith(`${href}/`)) ||
                  (!exactOnly && pathname.startsWith(href) && pathname !== href);
                // Prefer longest matching href for nested routes (e.g. chapters vs chapters/requests)
                const longerSiblingActive =
                  !exactOnly &&
                  group.items.some(
                    (other) =>
                      other.href !== href &&
                      other.href.startsWith(`${href}/`) &&
                      (pathname === other.href || pathname.startsWith(`${other.href}/`)),
                  );
                const isActive = active && !longerSiblingActive;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                      isActive
                        ? 'bg-primary-light text-primary-dark'
                        : 'text-muted hover:bg-surface-muted hover:text-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary transition-opacity',
                        isActive ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <Icon
                      className={cn(
                        'h-4 w-4 transition-colors',
                        isActive ? 'text-primary' : 'text-muted group-hover:text-foreground',
                      )}
                    />
                    {label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3 rounded-lg bg-surface-muted p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold uppercase text-white">
              {email.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{email}</p>
              <Badge className="mt-0.5" variant="secondary">
                {STAFF_ROLE_LABELS[role]}
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
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
