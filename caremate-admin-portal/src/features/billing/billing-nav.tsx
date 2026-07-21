import Link from 'next/link';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/dashboard/billing', label: 'Price catalog', key: 'prices' as const },
  {
    href: '/dashboard/billing/transactions',
    label: 'Transactions',
    key: 'transactions' as const,
  },
  {
    href: '/dashboard/billing/subscribers',
    label: 'Subscribers',
    key: 'subscribers' as const,
  },
] as const;

export function BillingNav({
  current,
}: {
  current: 'prices' | 'transactions' | 'subscribers';
}) {
  return (
    <nav
      className="mb-6 flex gap-1 border-b border-border"
      aria-label="Billing sections"
    >
      {TABS.map((tab) => {
        const active = tab.key === current;
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
