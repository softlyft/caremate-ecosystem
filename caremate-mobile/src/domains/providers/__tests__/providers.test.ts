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
import { resolveNearbyCoords, enableNearbyLocationAccess } from '@/domains/providers/location';

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

jest.mock('@/domains/onboarding/device-defaults', () => ({
  getDeviceDefaults: jest.fn(),
  setDeviceDefaults: jest.fn(),
}));

jest.mock('@/domains/location/repository', () => ({
  locationSampleRepository: {
    recordSample: jest.fn(),
    getLatest: jest.fn(),
  },
}));

jest.mock('@/features/auth/store', () => ({
  useAuthStore: {
    getState: () => ({ user: { id: 'user-1' }, isGuest: false }),
  },
}));

const Location = jest.requireMock('expo-location') as {
  getForegroundPermissionsAsync: jest.Mock;
  requestForegroundPermissionsAsync: jest.Mock;
  getCurrentPositionAsync: jest.Mock;
};
const { getDeviceDefaults, setDeviceDefaults } = jest.requireMock(
  '@/domains/onboarding/device-defaults',
) as {
  getDeviceDefaults: jest.Mock;
  setDeviceDefaults: jest.Mock;
};
const { locationSampleRepository } = jest.requireMock('@/domains/location/repository') as {
  locationSampleRepository: {
    recordSample: jest.Mock;
    getLatest: jest.Mock;
  };
};

describe('providers/types', () => {
  it('validates and formats provider types', () => {
    expect(PROVIDER_TYPES).toContain('hospital');
    expect(PRIMARY_PROVIDER_TYPES).toEqual([
      'hospital',
      'clinic',
      'pharmacy',
      'laboratory',
      'imaging_centre',
      'dentist',
      'eye_care',
    ]);
    expect(isProviderType('clinic')).toBe(true);
    expect(isProviderType('spa')).toBe(false);
    expect(formatProviderType('blood_bank')).toBe('Blood Bank');
    expect(formatProviderType('eye_care')).toBe('Eye Clinic');
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
  const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined as never);

  beforeEach(() => {
    getDeviceDefaults.mockReset();
    setDeviceDefaults.mockReset();
    Location.getForegroundPermissionsAsync.mockReset();
    Location.requestForegroundPermissionsAsync.mockReset();
    Location.getCurrentPositionAsync.mockReset();
    locationSampleRepository.recordSample.mockReset();
    locationSampleRepository.getLatest.mockReset();
    openSettings.mockClear();
  });

  afterAll(() => {
    openSettings.mockRestore();
  });

  it('falls back to last known sample when location mode is not precise', async () => {
    getDeviceDefaults.mockResolvedValue({
      countryCode: 'NG',
      state: 'LA',
      locationMode: 'approximate',
    });
    locationSampleRepository.getLatest.mockResolvedValue({
      id: 'sample-1',
      latitude: 6.45,
      longitude: 3.4,
    });

    await expect(resolveNearbyCoords()).resolves.toEqual({
      latitude: 6.45,
      longitude: 3.4,
      isApproximate: true,
      precision: 'last_known',
      locationEnabled: false,
      usingLastKnown: true,
      permissionBlocked: false,
      sampleId: 'sample-1',
    });
    expect(Location.getForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('returns empty coords when location is off and no sample exists', async () => {
    getDeviceDefaults.mockResolvedValue({
      countryCode: 'NG',
      state: null,
      locationMode: 'approximate',
    });
    locationSampleRepository.getLatest.mockResolvedValue(null);

    await expect(resolveNearbyCoords()).resolves.toMatchObject({
      latitude: null,
      longitude: null,
      precision: 'none',
      usingLastKnown: false,
      permissionBlocked: false,
    });
  });

  it('returns live GPS when precise mode is granted and records a sample', async () => {
    getDeviceDefaults.mockResolvedValue({
      countryCode: 'NG',
      state: null,
      locationMode: 'precise',
    });
    Location.getForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
      canAskAgain: true,
    });
    Location.getCurrentPositionAsync.mockResolvedValue({
      coords: {
        latitude: 6.45,
        longitude: 3.4,
        altitude: 12,
        accuracy: 8,
        altitudeAccuracy: 4,
        heading: 90,
        speed: 0.2,
      },
      mocked: false,
      timestamp: 1_700_000_000_000,
    });
    locationSampleRepository.recordSample.mockResolvedValue({
      id: 'sample-gps',
      latitude: 6.45,
      longitude: 3.4,
    });

    await expect(resolveNearbyCoords()).resolves.toEqual({
      latitude: 6.45,
      longitude: 3.4,
      isApproximate: false,
      precision: 'gps',
      locationEnabled: true,
      usingLastKnown: false,
      permissionBlocked: false,
      sampleId: 'sample-gps',
    });
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(locationSampleRepository.recordSample).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        latitude: 6.45,
        longitude: 3.4,
        altitude: 12,
        accuracy: 8,
        source: 'gps',
      }),
    );
  });

  it('falls back to last known when permission is denied or GPS fails', async () => {
    getDeviceDefaults.mockResolvedValue({
      countryCode: 'NG',
      state: null,
      locationMode: 'precise',
    });
    locationSampleRepository.getLatest.mockResolvedValue({
      id: 'sample-2',
      latitude: 6.5,
      longitude: 3.3,
    });
    Location.getForegroundPermissionsAsync.mockResolvedValue({
      status: 'denied',
      canAskAgain: true,
    });

    await expect(resolveNearbyCoords()).resolves.toMatchObject({
      precision: 'last_known',
      usingLastKnown: true,
      latitude: 6.5,
      permissionBlocked: false,
    });

    Location.getForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
      canAskAgain: true,
    });
    Location.getCurrentPositionAsync.mockRejectedValue(new Error('timeout'));

    await expect(resolveNearbyCoords()).resolves.toMatchObject({
      precision: 'last_known',
      usingLastKnown: true,
    });
  });

  it('marks permissionBlocked when the OS will not show the dialog again', async () => {
    getDeviceDefaults.mockResolvedValue({
      countryCode: 'NG',
      state: null,
      locationMode: 'precise',
    });
    locationSampleRepository.getLatest.mockResolvedValue(null);
    Location.getForegroundPermissionsAsync.mockResolvedValue({
      status: 'denied',
      canAskAgain: false,
    });

    await expect(resolveNearbyCoords()).resolves.toMatchObject({
      precision: 'none',
      permissionBlocked: true,
    });
  });

  it('requests permission when enabling and opens Settings when blocked', async () => {
    Location.getForegroundPermissionsAsync.mockResolvedValue({
      status: 'denied',
      canAskAgain: true,
    });
    Location.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'denied',
      canAskAgain: false,
    });

    await expect(enableNearbyLocationAccess()).resolves.toEqual({
      granted: false,
      openedSettings: true,
      canAskAgain: false,
    });
    expect(setDeviceDefaults).toHaveBeenCalledWith({
      locationMode: 'precise',
      locationSkipped: false,
    });
    expect(openSettings).toHaveBeenCalled();
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
                    system: 'https://getcaremate.com/fhir/CodeSystem/provider-type',
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
                url: 'https://getcaremate.com/fhir/StructureDefinition/provider-attributes',
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
                url: 'https://getcaremate.com/fhir/StructureDefinition/distance-km',
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
                url: 'https://getcaremate.com/fhir/StructureDefinition/provider-attributes',
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
