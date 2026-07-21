import { getProviderOrganizationId } from '@/domains/providers/connection-service';
import type { Provider } from '@/types';

function makeProvider(attributes: Record<string, unknown>): Provider {
  return {
    id: 'loc-1',
    name: 'Test Clinic',
    type: 'clinic',
    address: null,
    phone: null,
    email: null,
    latitude: null,
    longitude: null,
    isFavorite: false,
    distanceKm: null,
    attributes,
    syncStatus: 'synced',
    deletedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('getProviderOrganizationId', () => {
  it('reads organization_id from attributes', () => {
    expect(getProviderOrganizationId(makeProvider({ organization_id: 'org-1' }))).toBe('org-1');
  });

  it('reads organizationId camelCase fallback', () => {
    expect(getProviderOrganizationId(makeProvider({ organizationId: 'org-2' }))).toBe('org-2');
  });

  it('returns null when missing', () => {
    expect(getProviderOrganizationId(makeProvider({}))).toBeNull();
  });
});
