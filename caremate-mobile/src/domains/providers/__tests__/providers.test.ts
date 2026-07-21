import { Linking, Platform } from 'react-native';

import { canOpenInMaps, openInExternalMaps } from '@/domains/providers/open-in-maps';
import {
  formatProviderType,
  isProviderType,
  PRIMARY_PROVIDER_TYPES,
  PROVIDER_TYPES,
} from '@/domains/providers/types';
import {
  getLegacyProviderIds,
  getProviderSeeds,
  mapFhirProviderBundle,
} from '@/domains/providers/utils/fhir-providers';
import { resolveNearbyCoords } from '@/domains/providers/location';

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

jest.mock('@/domains/onboarding/device-defaults', () => ({
  getDeviceDefaults: jest.fn(),
}));

jest.mock('@/domains/localization', () => ({
  localizationService: {
    getFallbackCoords: jest.fn(() => ({ latitude: 6.5244, longitude: 3.3792 })),
  },
}));

const Location = jest.requireMock('expo-location') as {
  requestForegroundPermissionsAsync: jest.Mock;
  getCurrentPositionAsync: jest.Mock;
};
const { getDeviceDefaults } = jest.requireMock('@/domains/onboarding/device-defaults') as {
  getDeviceDefaults: jest.Mock;
};

describe('providers/types', () => {
  it('validates and formats provider types', () => {
    expect(PROVIDER_TYPES).toContain('hospital');
    expect(PRIMARY_PROVIDER_TYPES).toContain('pharmacy');
    expect(isProviderType('clinic')).toBe(true);
    expect(isProviderType('spa')).toBe(false);
    expect(formatProviderType('blood_bank')).toBe('Blood Bank');
    expect(formatProviderType('urgent_care')).toBe('urgent care');
  });
});

describe('providers/open-in-maps', () => {
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);

  beforeEach(() => {
    openURL.mockClear();
  });

  afterAll(() => {
    openURL.mockRestore();
  });

  it('detects openable address or coordinates', () => {
    expect(canOpenInMaps({ address: '  12 Marina  ' })).toBe(true);
    expect(canOpenInMaps({ latitude: 6.5, longitude: 3.3 })).toBe(true);
    expect(canOpenInMaps({ latitude: Number.NaN, longitude: 3.3 })).toBe(false);
    expect(canOpenInMaps({})).toBe(false);
  });

  it('opens Apple Maps on iOS with address or coordinates', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'ios' });

    await openInExternalMaps({ address: 'Lagos Island' });
    expect(openURL).toHaveBeenCalledWith(
      expect.stringContaining('http://maps.apple.com/?q=Lagos%20Island'),
    );

    openURL.mockClear();
    await openInExternalMaps({ latitude: 6.5, longitude: 3.3, label: 'Clinic' });
    expect(openURL).toHaveBeenCalledWith(
      expect.stringContaining('http://maps.apple.com/?ll=6.5,3.3'),
    );
  });

  it('opens geo: intents on Android', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' });

    await openInExternalMaps({ address: 'Abuja' });
    expect(openURL).toHaveBeenCalledWith(expect.stringContaining('geo:0,0?q=Abuja'));

    openURL.mockClear();
    await openInExternalMaps({ latitude: 9.0, longitude: 7.4, label: 'Lab' });
    expect(openURL.mock.calls[0]![0]).toContain('geo:9,7.4');
  });

  it('falls back to Google Maps on other platforms and no-ops without a target', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'web' });

    await openInExternalMaps({});
    expect(openURL).not.toHaveBeenCalled();

    await openInExternalMaps({ address: 'Accra' });
    expect(openURL).toHaveBeenCalledWith(
      expect.stringContaining('https://www.google.com/maps/search/?api=1&query=Accra'),
    );

    openURL.mockClear();
    await openInExternalMaps({ latitude: 5.6, longitude: -0.2 });
    expect(openURL).toHaveBeenCalledWith(expect.stringContaining('query=5.6,-0.2'));
  });
});

describe('providers/location', () => {
  beforeEach(() => {
    getDeviceDefaults.mockReset();
    Location.requestForegroundPermissionsAsync.mockReset();
    Location.getCurrentPositionAsync.mockReset();
  });

  it('uses approximate country pin when location mode is not precise', async () => {
    getDeviceDefaults.mockResolvedValue({
      countryCode: 'NG',
      state: 'LA',
      locationMode: 'approximate',
    });

    await expect(resolveNearbyCoords()).resolves.toEqual({
      latitude: 6.5244,
      longitude: 3.3792,
      isApproximate: true,
    });
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('returns live GPS when precise mode is granted', async () => {
    getDeviceDefaults.mockResolvedValue({
      countryCode: 'NG',
      state: null,
      locationMode: 'precise',
    });
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Location.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 6.45, longitude: 3.4 },
    });

    await expect(resolveNearbyCoords()).resolves.toEqual({
      latitude: 6.45,
      longitude: 3.4,
      isApproximate: false,
    });
  });

  it('falls back when permission is denied or GPS fails', async () => {
    getDeviceDefaults.mockResolvedValue({
      countryCode: 'NG',
      state: null,
      locationMode: 'precise',
    });
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

    await expect(resolveNearbyCoords()).resolves.toMatchObject({ isApproximate: true });

    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Location.getCurrentPositionAsync.mockRejectedValue(new Error('timeout'));
    getDeviceDefaults
      .mockResolvedValueOnce({
        countryCode: 'NG',
        state: null,
        locationMode: 'precise',
      })
      .mockResolvedValueOnce({
        countryCode: 'NG',
        state: null,
        locationMode: 'precise',
      });

    await expect(resolveNearbyCoords()).resolves.toMatchObject({ isApproximate: true });
  });

  it('falls back when GPS throws before defaults resolve', async () => {
    getDeviceDefaults.mockRejectedValueOnce(new Error('storage')).mockResolvedValueOnce({
      countryCode: 'NG',
      state: null,
      locationMode: 'precise',
    });

    await expect(resolveNearbyCoords()).resolves.toMatchObject({
      isApproximate: true,
      latitude: 6.5244,
    });
  });
});

describe('providers/fhir-providers', () => {
  it('maps Organization + Location FHIR entries into CareMate providers', () => {
    const providers = mapFhirProviderBundle({
      resourceType: 'Bundle',
      entry: [
        {
          resource: {
            resourceType: 'Organization',
            id: 'org-1',
            active: true,
            name: 'Lagos General',
            type: [
              {
                coding: [
                  {
                    system: 'https://caremate.app/fhir/CodeSystem/provider-type',
                    code: 'hospital',
                  },
                ],
              },
            ],
            telecom: [
              { system: 'phone', value: '+234800' },
              { system: 'email', value: 'info@example.com' },
            ],
            extension: [
              {
                url: 'https://caremate.app/fhir/StructureDefinition/provider-attributes',
                valueString: '{"emergencyDept":true}',
              },
            ],
          },
        },
        {
          resource: {
            resourceType: 'Location',
            id: 'loc-1',
            status: 'active',
            name: 'Main campus',
            address: { text: '12 Marina, Lagos' },
            position: { latitude: 6.45, longitude: 3.39 },
            managingOrganization: { reference: 'Organization/org-1' },
            extension: [
              {
                url: 'https://caremate.app/fhir/StructureDefinition/distance-km',
                valueDecimal: 2.5,
              },
            ],
          },
        },
        {
          resource: {
            resourceType: 'Organization',
            id: 'org-inactive',
            active: false,
            name: 'Closed Clinic',
          },
        },
        {
          resource: {
            resourceType: 'Location',
            id: 'loc-inactive',
            status: 'active',
            managingOrganization: { reference: 'Organization/org-inactive' },
          },
        },
      ],
    });

    expect(providers).toHaveLength(1);
    expect(providers[0]).toMatchObject({
      id: 'loc-1',
      name: 'Lagos General',
      type: 'hospital',
      address: '12 Marina, Lagos',
      phone: '+234800',
      email: 'info@example.com',
      latitude: 6.45,
      longitude: 3.39,
      distanceKm: 2.5,
      attributes: expect.objectContaining({
        emergencyDept: true,
        organization_id: 'org-1',
        location_id: 'loc-1',
      }),
    });
  });

  it('infers provider type from organization text and formats composed addresses', () => {
    const [provider] = mapFhirProviderBundle({
      resourceType: 'Bundle',
      entry: [
        {
          resource: {
            resourceType: 'Organization',
            id: 'org-2',
            active: true,
            name: 'City Pharmacy',
            type: [{ text: 'Community Pharmacy' }],
            address: [
              {
                line: ['1 Broad St'],
                city: 'Lagos',
                state: 'LA',
                country: 'NG',
              },
            ],
          },
        },
        {
          resource: {
            resourceType: 'Location',
            id: 'loc-2',
            status: 'active',
            managingOrganization: { reference: 'Organization/org-2' },
          },
        },
      ],
    });

    expect(provider!.type).toBe('pharmacy');
    expect(provider!.address).toBe('1 Broad St, Lagos, LA, NG');
  });

  it('skips inactive locations and tolerates bad attributes JSON', () => {
    const providers = mapFhirProviderBundle({
      resourceType: 'Bundle',
      entry: [
        {
          resource: {
            resourceType: 'Organization',
            id: 'org-3',
            active: true,
            name: 'Lab',
            type: [{ text: 'diagnostic lab' }],
            extension: [
              {
                url: 'https://caremate.app/fhir/StructureDefinition/provider-attributes',
                valueString: '{not-json',
              },
            ],
          },
        },
        {
          resource: {
            resourceType: 'Location',
            id: 'loc-3',
            status: 'suspended',
            managingOrganization: { reference: 'Organization/org-3' },
          },
        },
        {
          resource: {
            resourceType: 'Location',
            id: 'loc-4',
            status: 'active',
            managingOrganization: { reference: 'Organization/org-3' },
          },
        },
      ],
    });

    expect(providers).toHaveLength(1);
    expect(providers[0]!.type).toBe('laboratory');
    expect(providers[0]!.attributes).toMatchObject({
      organization_id: 'org-3',
      location_id: 'loc-4',
    });
  });

  it('infers specialty types from free-text and falls back to clinic', () => {
    const cases: { text: string; type: string; name?: string }[] = [
      { text: 'Telehealth virtual care', type: 'telemedicine' },
      { text: 'Dental / dentist office', type: 'dentist' },
      { text: 'Eye care / optical shop', type: 'eye_care' },
      { text: 'Diagnostic imaging centre', type: 'imaging_centre' },
      { text: 'Health insurance / HMO', type: 'insurance' },
      { text: 'Home care nursing', type: 'home_care' },
      { text: 'Medical equipment supplier', type: 'medical_equipment' },
      { text: 'Government health office', type: 'government_health' },
      { text: 'Community NGO clinic', type: 'ngo' },
      { text: 'Mental wellness center', type: 'mental_health' },
      { text: 'Ambulance response unit', type: 'ambulance' },
      { text: 'Blood donation bank', type: 'blood_bank' },
      { text: 'Community clinic', type: 'clinic' },
      { text: 'Something else', type: 'clinic' },
    ];

    for (const [index, item] of cases.entries()) {
      const [provider] = mapFhirProviderBundle({
        resourceType: 'Bundle',
        entry: [
          {
            resource: {
              resourceType: 'Organization',
              id: `org-t-${index}`,
              active: true,
              name: item.name ?? `Org ${index}`,
              type: [{ text: item.text }],
            },
          },
          {
            resource: {
              resourceType: 'Location',
              id: `loc-t-${index}`,
              status: 'active',
              managingOrganization: { reference: `Organization/org-t-${index}` },
            },
          },
        ],
      });
      expect(provider!.type).toBe(item.type);
    }
  });

  it('uses location name / Unknown provider when organization name is blank', () => {
    const [named] = mapFhirProviderBundle({
      resourceType: 'Bundle',
      entry: [
        {
          resource: {
            resourceType: 'Organization',
            id: 'org-blank',
            active: true,
            name: '   ',
            type: [{ text: 'hospital' }],
          },
        },
        {
          resource: {
            resourceType: 'Location',
            id: 'loc-named',
            status: 'active',
            name: 'Wing A',
            managingOrganization: { reference: 'Organization/org-blank' },
          },
        },
      ],
    });
    expect(named!.name).toBe('Wing A');

    const [unknown] = mapFhirProviderBundle({
      resourceType: 'Bundle',
      entry: [
        {
          resource: {
            resourceType: 'Organization',
            id: 'org-blank-2',
            active: true,
            type: [{ text: 'hospital' }],
          },
        },
        {
          resource: {
            resourceType: 'Location',
            id: 'loc-unknown',
            status: 'active',
            managingOrganization: { reference: 'Organization/org-blank-2' },
          },
        },
      ],
    });
    expect(unknown!.name).toBe('Unknown provider');
  });

  it('skips resources without ids or organization references', () => {
    expect(
      mapFhirProviderBundle({
        resourceType: 'Bundle',
        entry: [
          { resource: { resourceType: 'Organization', active: true, name: 'No id' } },
          {
            resource: {
              resourceType: 'Location',
              id: 'loc-orphan',
              status: 'active',
              managingOrganization: { reference: 'Practitioner/1' },
            },
          },
        ],
      }),
    ).toEqual([]);
  });

  it('loads bundled seed providers', () => {
    const seeds = getProviderSeeds();
    expect(seeds.length).toBeGreaterThan(0);
    expect(seeds.every((provider) => provider.id && provider.name && provider.type)).toBe(true);
  });

  it('exposes legacy seed ids', () => {
    expect(getLegacyProviderIds()).toEqual([
      'provider-1',
      'provider-2',
      'provider-3',
      'provider-4',
    ]);
  });
});
