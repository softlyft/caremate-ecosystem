import { TabNav } from '@/components/tab-nav';

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
  return <TabNav tabs={TABS} current={current} ariaLabel="Billing sections" />;
}
