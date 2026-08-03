import {
  applyConsentScope,
  definitionToConsentUi,
  hasConsentScope,
  listAvailableConsents,
  listGrantedConsents,
  normalizeSharedScopes,
  resolveConsentTitle,
} from '@/domains/providers/connection-consents';

describe('connection-consents', () => {
  it('detects emergency consent', () => {
    expect(hasConsentScope(['basic'], 'emergency')).toBe(false);
    expect(hasConsentScope(['basic', 'emergency'], 'emergency')).toBe(true);
  });

  it('grants and revokes while keeping basic', () => {
    expect(applyConsentScope(['basic'], 'emergency', true)).toEqual(['basic', 'emergency']);
    expect(applyConsentScope(['basic', 'emergency'], 'emergency', false)).toEqual(['basic']);
    expect(applyConsentScope([], 'emergency', true)).toEqual(['basic', 'emergency']);
  });

  it('normalizes shared scopes', () => {
    expect(normalizeSharedScopes([])).toEqual(['basic']);
    expect(normalizeSharedScopes(['emergency'])).toEqual(['basic', 'emergency']);
  });

  it('lists available vs granted from registry definitions', () => {
    const definitions = [
      {
        id: 'def-1',
        code: 'emergency',
        organizationId: null,
        source: 'system' as const,
        fhirScope: 'patient-privacy',
        fhirPolicyRule: 'OPTIN',
        dataClass: 'emergency_profile',
        title: 'Emergency profile',
        description: 'Clinical emergency details',
        active: true,
      },
      {
        id: 'def-2',
        code: 'vitals',
        organizationId: null,
        source: 'system' as const,
        fhirScope: 'patient-privacy',
        fhirPolicyRule: 'OPTIN',
        dataClass: 'observation',
        title: 'Vitals',
        description: 'Vital signs',
        active: true,
      },
    ];

    expect(listAvailableConsents(['basic'], definitions).map((c) => c.scope)).toEqual([
      'emergency',
      'vitals',
    ]);
    expect(listGrantedConsents(['basic', 'emergency'], definitions).map((c) => c.scope)).toEqual([
      'emergency',
    ]);
    expect(listAvailableConsents(['basic', 'emergency', 'vitals'], definitions)).toEqual([]);
  });

  it('falls back to offline CareMate mirror without definitions', () => {
    expect(listAvailableConsents(['basic']).map((c) => c.scope)).toEqual(['emergency']);
    expect(listGrantedConsents(['basic', 'emergency']).map((c) => c.scope)).toEqual(['emergency']);
  });

  it('maps definition to UI and resolves title', () => {
    const ui = definitionToConsentUi({
      id: 'def-1',
      code: 'emergency',
      organizationId: null,
      source: 'system',
      fhirScope: 'patient-privacy',
      fhirPolicyRule: 'OPTIN',
      dataClass: 'emergency_profile',
      title: 'Emergency profile',
      description: 'Details',
      active: true,
    });
    expect(ui.definitionId).toBe('def-1');
    expect(resolveConsentTitle(ui, (key) => key)).toBe('Emergency profile');
    expect(
      resolveConsentTitle(ui, (key) =>
        key.includes('emergency.title') ? 'Translated emergency' : key,
      ),
    ).toBe('Translated emergency');
  });
});
