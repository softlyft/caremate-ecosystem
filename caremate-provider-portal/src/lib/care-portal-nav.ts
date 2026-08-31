import type { LucideIcon } from 'lucide-react';
import type { ProviderModuleKey } from '@/domains/modules/catalog';

export type CarePortalNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Provider workspace only — omit on payer nav. */
  module?: ProviderModuleKey | 'settings';
  /**
   * exact — pathname must equal href
   * prefix — pathname starts with href (default for most items)
   * list — prefix match but not when pathname is under `{href}/requests`
   */
  match?: 'exact' | 'prefix' | 'list';
};

export type CarePortalNavGroup = {
  label: string;
  items: CarePortalNavItem[];
};

export function isCarePortalNavItemActive(pathname: string, item: CarePortalNavItem): boolean {
  if (pathname === item.href) return true;

  const match = item.match ?? 'prefix';

  if (match === 'exact') return false;

  if (match === 'list') {
    if (!pathname.startsWith(item.href)) return false;
    return !pathname.startsWith(`${item.href}/requests`);
  }

  return pathname.startsWith(item.href);
}

export function filterNavGroupsByModules(
  groups: CarePortalNavGroup[],
  enabledModules: ProviderModuleKey[],
): CarePortalNavGroup[] {
  const enabled = new Set(enabledModules);
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.module || item.module === 'settings' || enabled.has(item.module),
      ),
    }))
    .filter((group) => group.items.length > 0);
}

/** Build href for dual-paginated connection request pages (page + outboundPage). */
export function dualPageRequestsHref(
  basePath: string,
  opts: { page?: number; outboundPage?: number },
): string {
  const params = new URLSearchParams();
  if (opts.page && opts.page > 1) params.set('page', String(opts.page));
  if (opts.outboundPage && opts.outboundPage > 1) {
    params.set('outboundPage', String(opts.outboundPage));
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
