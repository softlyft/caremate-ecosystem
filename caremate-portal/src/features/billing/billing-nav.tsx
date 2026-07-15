import Link from 'next/link';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/dashboard/billing', label: 'Price catalog', match: 'exact' as const },
  {
    href: '/dashboard/billing/subscribers',
    label: 'Subscribers',
    match: 'prefix' as const,
  },
] as const;

export function BillingNav({ current }: { current: 'prices' | 'subscribers' }) {
  return (
    <nav
      className="mb-6 flex gap-1 border-b border-border"
      aria-label="Billing sections"
    >
      {TABS.map((tab) => {
        const active =
          (tab.match === 'exact' && current === 'prices') ||
          (tab.match === 'prefix' && current === 'subscribers');
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted hover:text-foreground',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
