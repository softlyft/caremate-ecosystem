import { TabNav } from '@/components/tab-nav';

const PROVIDER_PLAN_TABS = [
  { href: '/dashboard/provider-plans', label: 'Price catalog', key: 'prices' as const },
  { href: '/dashboard/provider-plans/grants', label: 'Grants', key: 'grants' as const },
] as const;

export function ProviderPlansNav({ current }: { current: 'prices' | 'grants' }) {
  return (
    <TabNav tabs={PROVIDER_PLAN_TABS} current={current} ariaLabel="Provider plan sections" />
  );
}
