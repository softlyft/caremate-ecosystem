import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildHealthcareServiceResource,
  buildLocationResource,
} from '@/domains/catalog/fhir-resource';

describe('catalog fhir-resource builders', () => {
  it('builds a Location resource with managingOrganization', () => {
    const resource = buildLocationResource({
      id: 'loc-1',
      organizationId: 'org-1',
      name: 'Main campus',
      status: 'active',
      address: '12 Broad St',
      phone: '+234100',
      email: 'site@example.com',
      latitude: 6.45,
      longitude: 3.39,
    }) as Record<string, unknown>;

    assert.equal(resource.resourceType, 'Location');
    assert.equal(resource.id, 'loc-1');
    assert.equal(resource.name, 'Main campus');
    assert.deepEqual(resource.managingOrganization, {
      reference: 'Organization/org-1',
    });
    assert.deepEqual(resource.position, { latitude: 6.45, longitude: 3.39 });
  });

  it('builds a HealthcareService resource with location and providedBy', () => {
    const resource = buildHealthcareServiceResource({
      id: 'hs-1',
      organizationId: 'org-1',
      locationId: 'loc-1',
      name: 'General Practice',
      active: true,
      serviceType: 'clinic',
    }) as Record<string, unknown>;

    assert.equal(resource.resourceType, 'HealthcareService');
    assert.equal(resource.id, 'hs-1');
    assert.deepEqual(resource.providedBy, { reference: 'Organization/org-1' });
    assert.deepEqual(resource.location, [{ reference: 'Location/loc-1' }]);
  });
});
