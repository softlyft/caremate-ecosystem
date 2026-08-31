/**
 * CareMate Provider Portal capability modules.
 *
 * Defaults are ON for engagement features already shipped.
 * Optional modules start OFF and can be activated in Settings when shipped.
 * Missing DB override → catalog defaultEnabled.
 */

export const PROVIDER_MODULE_KEYS = [
  'dashboard',
  'patients',
  'payers',
  'appointments',
  'documents',
  'messaging',
  'analytics',
  'organization',
] as const;

export type ProviderModuleKey = (typeof PROVIDER_MODULE_KEYS)[number];

export type ProviderModuleDefinition = {
  key: ProviderModuleKey;
  name: string;
  description: string;
  /** When true and no org override, module is enabled. */
  defaultEnabled: boolean;
  /**
   * When true, shown on Settings → Modules for activate/deactivate.
   * Core engagement modules stay on by default and are not listed yet.
   */
  activatable: boolean;
  /** Nav / route prefixes gated by this module. */
  hrefs: readonly string[];
  navGroup: 'General' | 'Patients' | 'Payers' | 'Engagement' | 'Organization';
  navLabel: string;
};

export const PROVIDER_MODULES: readonly ProviderModuleDefinition[] = [
  {
    key: 'dashboard',
    name: 'Dashboard',
    description: 'Organization overview and recent activity.',
    defaultEnabled: true,
    activatable: false,
    hrefs: ['/app/dashboard'],
    navGroup: 'General',
    navLabel: 'Dashboard',
  },
  {
    key: 'patients',
    name: 'Patient connections',
    description: 'Connected patients and connection requests.',
    defaultEnabled: true,
    activatable: false,
    hrefs: ['/app/patients', '/app/patients/requests'],
    navGroup: 'Patients',
    navLabel: 'Connected Patients',
  },
  {
    key: 'payers',
    name: 'Payer connections',
    description: 'Connected health insurers and connection requests.',
    defaultEnabled: true,
    activatable: false,
    hrefs: ['/app/payers', '/app/payers/requests'],
    navGroup: 'Payers',
    navLabel: 'Connected Payers',
  },
  {
    key: 'appointments',
    name: 'Appointments',
    description: 'Availability, scheduling, request queue, and check-in.',
    defaultEnabled: false,
    activatable: false,
    hrefs: ['/app/appointments'],
    navGroup: 'Engagement',
    navLabel: 'Appointments',
  },
  {
    key: 'documents',
    name: 'Documents',
    description: 'Shared clinical and administrative documents.',
    defaultEnabled: true,
    activatable: false,
    hrefs: ['/app/documents'],
    navGroup: 'Engagement',
    navLabel: 'Documents',
  },
  {
    key: 'messaging',
    name: 'Messaging',
    description: 'Secure messages with connected patients.',
    defaultEnabled: true,
    activatable: false,
    hrefs: ['/app/broadcasts'],
    navGroup: 'Engagement',
    navLabel: 'Messages',
  },
  {
    key: 'analytics',
    name: 'Analytics',
    description: 'Simple engagement metrics.',
    defaultEnabled: true,
    activatable: false,
    hrefs: ['/app/analytics'],
    navGroup: 'Engagement',
    navLabel: 'Analytics',
  },
  {
    key: 'organization',
    name: 'Organization',
    description: 'Org profile, locations, and services.',
    defaultEnabled: true,
    activatable: false,
    hrefs: ['/app/organization'],
    navGroup: 'Organization',
    navLabel: 'Organization',
  },
] as const;

export function isProviderModuleKey(value: string): value is ProviderModuleKey {
  return (PROVIDER_MODULE_KEYS as readonly string[]).includes(value);
}

export function getModuleDefinition(key: ProviderModuleKey): ProviderModuleDefinition {
  const found = PROVIDER_MODULES.find((m) => m.key === key);
  if (!found) throw new Error(`Unknown module: ${key}`);
  return found;
}

export function listActivatableModules(): ProviderModuleDefinition[] {
  return PROVIDER_MODULES.filter((m) => m.activatable);
}

/** Resolve enabled set from catalog defaults + org overrides. */
export function resolveEnabledModules(
  overrides: ReadonlyArray<{ module_key: string; enabled: boolean }>,
): Set<ProviderModuleKey> {
  const byKey = new Map(overrides.map((o) => [o.module_key, o.enabled]));
  const enabled = new Set<ProviderModuleKey>();
  for (const mod of PROVIDER_MODULES) {
    const override = byKey.get(mod.key);
    const on = override === undefined ? mod.defaultEnabled : override;
    if (on) enabled.add(mod.key);
  }
  return enabled;
}

export function isModuleEnabled(
  enabled: ReadonlySet<ProviderModuleKey>,
  key: ProviderModuleKey,
): boolean {
  return enabled.has(key);
}

/** Map a path to the module that owns it (settings always allowed). */
export function moduleKeyForPath(pathname: string): ProviderModuleKey | null {
  if (!pathname.startsWith('/app')) return null;
  if (pathname.startsWith('/app/settings')) return null;
  if (pathname.startsWith('/app/appointments')) return 'appointments';
  if (pathname.startsWith('/app/documents')) return 'documents';
  if (pathname.startsWith('/app/broadcasts')) return 'messaging';
  if (pathname.startsWith('/app/analytics')) return 'analytics';
  if (pathname.startsWith('/app/organization')) return 'organization';
  if (pathname.startsWith('/app/patients')) return 'patients';
  if (pathname.startsWith('/app/payers')) return 'payers';
  if (pathname.startsWith('/app/dashboard')) return 'dashboard';
  return null;
}
