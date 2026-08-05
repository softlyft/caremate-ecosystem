'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  FileText,
  Megaphone,
  BarChart3,
  Building2,
  Settings,
  LogOut,
  FlaskConical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/browser';
import { PROVIDER_ROLE_LABELS } from '@/constants/roles';
import type { ProviderMemberRole } from '@/types/database';
import type { ProviderModuleKey } from '@/domains/modules/catalog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  module: ProviderModuleKey | 'settings';
};

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'General',
    items: [{ href: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard, module: 'dashboard' }],
  },
  {
    label: 'Patients',
    items: [
      { href: '/app/patients', label: 'Connected Patients', icon: Users, module: 'patients' },
      {
        href: '/app/patients/requests',
        label: 'Connection Requests',
        icon: UserPlus,
        module: 'patients',
      },
    ],
  },
  {
    label: 'Engagement',
    items: [
      { href: '/app/documents', label: 'Documents', icon: FileText, module: 'documents' },
      { href: '/app/broadcasts', label: 'Messages', icon: Megaphone, module: 'messaging' },
      { href: '/app/analytics', label: 'Analytics', icon: BarChart3, module: 'analytics' },
    ],
  },
  {
    label: 'Clinical',
    items: [{ href: '/app/lab', label: 'Laboratory', icon: FlaskConical, module: 'laboratory' }],
  },
  {
    label: 'Organization',
    items: [
      {
        href: '/app/organization',
        label: 'Organization',
        icon: Building2,
        module: 'organization',
      },
      { href: '/app/settings', label: 'Settings', icon: Settings, module: 'settings' },
    ],
  },
];

export function AppShell({
  children,
  email,
  role,
  organizationName,
  enabledModules,
}: {
  children: React.ReactNode;
  email: string;
  role: ProviderMemberRole;
  organizationName: string;
  enabledModules: ProviderModuleKey[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, startSignOut] = useTransition();
  const enabled = new Set(enabledModules);

  const signOut = () => {
    startSignOut(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace('/login');
      router.refresh();
    });
  };

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => item.module === 'settings' || enabled.has(item.module),
    ),
  })).filter((group) => group.items.length > 0);

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
          <div className="min-w-0 leading-tight">
            <p className="text-sm font-semibold tracking-tight text-brand-navy">CareMate</p>
            <p className="truncate text-xs text-muted">Provider Portal</p>
          </div>
        </div>

        <div className="mx-4 mb-2 rounded-lg bg-primary-light/60 px-3 py-2">
          <p className="truncate text-xs font-medium text-primary-dark">{organizationName}</p>
        </div>

        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-3">
          {visibleGroups.map((group) => (
            <div key={group.label} className="flex flex-col gap-1">
              <p className="px-3 pb-1 text-[0.68rem] font-semibold uppercase tracking-wider text-muted/70">
                {group.label}
              </p>
              {group.items.map(({ href, label, icon: Icon }) => {
                const active =
                  pathname === href ||
                  (href !== '/app/dashboard' &&
                    href !== '/app/patients' &&
                    pathname.startsWith(href)) ||
                  (href === '/app/patients' &&
                    pathname.startsWith('/app/patients') &&
                    !pathname.startsWith('/app/patients/requests'));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                      active
                        ? 'bg-primary-light text-primary-dark'
                        : 'text-muted hover:bg-surface-muted hover:text-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary transition-opacity',
                        active ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <Icon
                      className={cn(
                        'h-4 w-4 transition-colors',
                        active ? 'text-primary' : 'text-muted group-hover:text-foreground',
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
                {PROVIDER_ROLE_LABELS[role]}
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
