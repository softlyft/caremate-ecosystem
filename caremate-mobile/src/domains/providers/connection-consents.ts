/**
 * CareMate connection consent helpers.
 *
 * Authorization source of truth is DB:
 * - `consent_definitions` (registry)
 * - `patient_provider_consents` (FHIR Consent–aligned grants)
 * - `shared_scopes` (denormalized permit cache for RLS)
 *
 * This module keeps a thin mirror of known CareMate system codes for i18n /
 * offline labels, and pure helpers for grant/revoke UI state.
 */

/** Known CareMate system consent codes (i18n + offline). Not an allowlist for auth. */
export const CAREMATE_SYSTEM_CONSENT_CODES = ['emergency', 'messaging'] as const;

export type CareMateSystemConsentCode = (typeof CAREMATE_SYSTEM_CONSENT_CODES)[number];

/** @deprecated Prefer ConsentDefinitionCode from registry; kept for existing call sites. */
export type ConnectionConsentScope = string;

export type ConsentDefinitionSource = 'system' | 'organization';

export type ConsentDefinition = {
  id: string;
  code: string;
  organizationId: string | null;
  source: ConsentDefinitionSource;
  fhirScope: string;
  fhirPolicyRule: string;
  dataClass: string;
  title: string;
  description: string;
  active: boolean;
};

export type PatientProviderConsentStatus =
  | 'draft'
  | 'active'
  | 'inactive'
  | 'entered-in-error';

export type PatientProviderConsent = {
  id: string;
  connectionId: string;
  patientId: string;
  organizationId: string;
  definitionId: string;
  status: PatientProviderConsentStatus;
  fhirScope: string;
  provisionType: 'permit' | 'deny';
  purpose: string;
  grantedAt: string | null;
  revokedAt: string | null;
  /** Definition code when joined (e.g. emergency). */
  code?: string;
};

export type ConnectionConsentDefinition = {
  /** Registry definition id when loaded from DB; may be empty for i18n-only mirror. */
  definitionId?: string;
  scope: string;
  dataClass?: string;
  fhirScope?: string;
  titleKey: string;
  descriptionKey: string;
  /** Fallback display when i18n key is missing (DB title). */
  title?: string;
  description?: string;
};

/** Offline / i18n mirror for CareMate system consents. */
export const CONNECTION_CONSENTS: readonly ConnectionConsentDefinition[] = [
  {
    scope: 'emergency',
    dataClass: 'emergency_profile',
    fhirScope: 'patient-privacy',
    titleKey: 'nearby.connections.consents.emergency.title',
    descriptionKey: 'nearby.connections.consents.emergency.description',
  },
  {
    scope: 'messaging',
    dataClass: 'messaging',
    fhirScope: 'patient-privacy',
    titleKey: 'nearby.connections.consents.messaging.title',
    descriptionKey: 'nearby.connections.consents.messaging.description',
  },
] as const;

export function isCareMateSystemConsentCode(value: string): value is CareMateSystemConsentCode {
  return (CAREMATE_SYSTEM_CONSENT_CODES as readonly string[]).includes(value);
}

/** @deprecated Use isCareMateSystemConsentCode or registry lookup. */
export function isConnectionConsentScope(value: string): boolean {
  return value.trim().length > 0 && value !== 'basic';
}

export function hasConsentScope(scopes: readonly string[], scope: string): boolean {
  return scopes.includes(scope);
}

/** Merge grant/revoke into a scopes array; always keeps `basic`. */
export function applyConsentScope(
  current: readonly string[],
  scope: string,
  granted: boolean,
): string[] {
  const cleaned = scope.trim();
  if (!cleaned || cleaned === 'basic') {
    return normalizeSharedScopes(current);
  }
  const without = current.filter((s) => s !== cleaned && s !== 'basic');
  const next = granted ? ['basic', ...without, cleaned] : ['basic', ...without];
  return [...new Set(next)];
}

export function normalizeSharedScopes(scopes: readonly string[]): string[] {
  const cleaned = scopes.map((s) => s.trim()).filter(Boolean);
  if (!cleaned.includes('basic')) {
    return ['basic', ...cleaned];
  }
  return [...new Set(cleaned)];
}

export function definitionToConsentUi(
  definition: ConsentDefinition,
): ConnectionConsentDefinition {
  const systemMirror = CONNECTION_CONSENTS.find((c) => c.scope === definition.code);
  return {
    definitionId: definition.id,
    scope: definition.code,
    dataClass: definition.dataClass,
    fhirScope: definition.fhirScope,
    titleKey: systemMirror?.titleKey ?? `nearby.connections.consents.${definition.code}.title`,
    descriptionKey:
      systemMirror?.descriptionKey ?? `nearby.connections.consents.${definition.code}.description`,
    title: definition.title,
    description: definition.description,
  };
}

export function listAvailableConsents(
  scopes: readonly string[],
  definitions: readonly ConsentDefinition[] = [],
): ConnectionConsentDefinition[] {
  if (definitions.length > 0) {
    return definitions
      .filter((d) => d.active && !hasConsentScope(scopes, d.code))
      .map(definitionToConsentUi);
  }
  return CONNECTION_CONSENTS.filter((consent) => !hasConsentScope(scopes, consent.scope));
}

export function listGrantedConsents(
  scopes: readonly string[],
  definitions: readonly ConsentDefinition[] = [],
): ConnectionConsentDefinition[] {
  if (definitions.length > 0) {
    return definitions
      .filter((d) => d.active && hasConsentScope(scopes, d.code))
      .map(definitionToConsentUi);
  }
  return CONNECTION_CONSENTS.filter((consent) => hasConsentScope(scopes, consent.scope));
}

/** Resolve display title: prefer i18n when key resolves; else DB title. */
export function resolveConsentTitle(
  consent: ConnectionConsentDefinition,
  t: (key: string) => string,
): string {
  const translated = t(consent.titleKey);
  if (translated && translated !== consent.titleKey) {
    return translated;
  }
  return consent.title?.trim() || consent.scope;
}

export function resolveConsentDescription(
  consent: ConnectionConsentDefinition,
  t: (key: string) => string,
): string {
  const translated = t(consent.descriptionKey);
  if (translated && translated !== consent.descriptionKey) {
    return translated;
  }
  return consent.description?.trim() || '';
}
