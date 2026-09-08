'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/browser';
import { PROVIDER_ROLE_LABELS } from '@/constants/roles';
import type { ProviderMemberRole } from '@/types/database';
import type { ProviderModuleKey } from '@/domains/modules/catalog';
import {
  filterNavGroupsByModules,
  isCarePortalNavItemActive,
  type CarePortalNavGroup,
} from '@/lib/care-portal-nav';
import type { CarePortalNavBadges } from '@/lib/nav-badges';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

function formatNavBadgeCount(count: number): string {
  if (count > 99) return '99+';
  return String(count);
}

function SidebarBody({
  email,
  role,
  organizationName,
  workspaceSubtitle,
  visibleGroups,
  pathname,
  navBadges,
  signingOut,
  onSignOut,
  onNavigate,
  onClose,
}: {
  email: string;
  role: ProviderMemberRole;
  organizationName: string;
  workspaceSubtitle: string;
  visibleGroups: CarePortalNavGroup[];
  pathname: string;
  navBadges?: CarePortalNavBadges;
  signingOut: boolean;
  onSignOut: () => void;
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <Image
            src="/brand/caremate-icon.png"
            alt="CareMate"
            width={40}
            height={40}
            className="h-9 w-9 object-contain"
            priority
          />
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-sm font-semibold tracking-tight text-brand-navy">CareMate</p>
          <p className="truncate text-xs text-muted">{workspaceSubtitle}</p>
        </div>
        {onClose ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
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
            {group.items.map(({ href, label, icon: Icon, ...item }) => {
              const active = isCarePortalNavItemActive(pathname, { href, label, icon: Icon, ...item });
              const badgeCount = navBadges?.[href] ?? 0;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
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
                      'h-4 w-4 shrink-0 transition-colors',
                      active ? 'text-primary' : 'text-muted group-hover:text-foreground',
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  {badgeCount > 0 ? (
                    <span
                      className="ml-auto inline-flex min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-warning px-1.5 py-0.5 text-[0.65rem] font-semibold leading-none text-white"
                      aria-label={`${badgeCount} pending`}
                    >
                      {formatNavBadgeCount(badgeCount)}
                    </span>
                  ) : null}
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
          onClick={onSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </>
  );
}

export function CarePortalShell({
  children,
  email,
  role,
  organizationName,
  workspaceSubtitle,
  navGroups,
  enabledModules,
  navBadges,
}: {
  children: React.ReactNode;
  email: string;
  role: ProviderMemberRole;
  organizationName: string;
  workspaceSubtitle: string;
  navGroups: CarePortalNavGroup[];
  enabledModules?: ProviderModuleKey[];
  /** Inbound pending counts keyed by nav href. */
  navBadges?: CarePortalNavBadges;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, startSignOut] = useTransition();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [navPathname, setNavPathname] = useState(pathname);

  if (pathname !== navPathname) {
    setNavPathname(pathname);
    setMobileNavOpen(false);
  }

  const visibleGroups = enabledModules
    ? filterNavGroupsByModules(navGroups, enabledModules)
    : navGroups;

  useEffect(() => {
    if (!mobileNavOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileNavOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileNavOpen]);

  const signOut = () => {
    startSignOut(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace('/login');
      router.refresh();
    });
  };

  const closeMobileNav = () => setMobileNavOpen(false);

  const sidebarProps = {
    email,
    role,
    organizationName,
    workspaceSubtitle,
    visibleGroups,
    pathname,
    navBadges,
    signingOut,
    onSignOut: signOut,
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <SidebarBody {...sidebarProps} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-surface px-4 py-3 lg:hidden">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setMobileNavOpen(true)}
            aria-expanded={mobileNavOpen}
            aria-controls="care-portal-mobile-nav"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-brand-navy">{organizationName}</p>
            <p className="truncate text-xs text-muted">{workspaceSubtitle}</p>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
        </main>
      </div>

      {mobileNavOpen ? (
        <div className="lg:hidden">
          <button
            type="button"
            className="fixed inset-0 z-40 bg-brand-navy/40"
            aria-label="Close menu"
            onClick={closeMobileNav}
          />
          <aside
            id="care-portal-mobile-nav"
            className="fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] flex-col border-r border-border bg-surface shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Care Portal navigation"
          >
            <SidebarBody {...sidebarProps} onNavigate={closeMobileNav} onClose={closeMobileNav} />
          </aside>
        </div>
      ) : null}
    </div>
  );
}
