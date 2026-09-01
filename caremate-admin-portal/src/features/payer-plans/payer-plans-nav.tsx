import { TabNav } from '@/components/tab-nav';

const PAYER_PLAN_TABS = [
  { href: '/dashboard/payer-plans', label: 'Price catalog', key: 'prices' as const },
  { href: '/dashboard/payer-plans/grants', label: 'Activation', key: 'grants' as const },
] as const;

export function PayerPlansNav({ current }: { current: 'prices' | 'grants' }) {
  return (
    <TabNav tabs={PAYER_PLAN_TABS} current={current} ariaLabel="Payer plan sections" />
  );
}
