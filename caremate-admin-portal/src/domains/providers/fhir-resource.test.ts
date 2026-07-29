import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildHealthcareServiceResource,
  buildLocationResource,
  buildOrganizationResource,
} from '@/domains/providers/fhir-resource';

describe('provider fhir-resource builders', () => {
  it('builds an Organization resource', () => {
    const resource = buildOrganizationResource({
      id: 'org-1',
      name: 'Lagos Clinic',
      active: true,
    }) as Record<string, unknown>;

    assert.equal(resource.resourceType, 'Organization');
    assert.equal(resource.id, 'org-1');
    assert.equal(resource.name, 'Lagos Clinic');
    assert.equal(resource.active, true);
  });

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
    assert.deepEqual(resource.providedBy, { reference: 'Organization/org-1' });
    assert.deepEqual(resource.location, [{ reference: 'Location/loc-1' }]);
  });
});
