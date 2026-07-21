import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildProviderFhirBundle } from '@/domains/providers/fhir-bundle';

describe('buildProviderFhirBundle', () => {
  it('assembles Organization, Location, and HealthcareService entries', () => {
    const bundle = buildProviderFhirBundle({
      organizationId: 'org-1',
      organizationResource: {
        resourceType: 'Organization',
        id: 'org-1',
        name: 'Lagos General',
      },
      locationId: 'loc-1',
      locationResource: {
        resourceType: 'Location',
        id: 'loc-1',
        name: 'Main campus',
      },
      healthcareServices: [
        {
          id: 'hs-1',
          resource: {
            resourceType: 'HealthcareService',
            id: 'hs-1',
            name: 'Emergency',
          },
        },
      ],
    });

    assert.equal(bundle.resourceType, 'Bundle');
    assert.equal(bundle.type, 'collection');
    assert.equal(bundle.total, 3);
    assert.deepEqual(
      bundle.entry.map((e) => e.fullUrl),
      ['Organization/org-1', 'Location/loc-1', 'HealthcareService/hs-1'],
    );
  });

  it('builds a single Organization bundle', () => {
    const bundle = buildProviderFhirBundle({
      organizationId: 'org-1',
      organizationResource: {
        resourceType: 'Organization',
        id: 'org-1',
        name: 'Solo Org',
      },
    });

    assert.equal(bundle.total, 1);
    assert.equal(bundle.entry[0]?.fullUrl, 'Organization/org-1');
  });

  it('builds a single HealthcareService bundle', () => {
    const bundle = buildProviderFhirBundle({
      healthcareServices: [
        {
          id: 'hs-9',
          resource: {
            resourceType: 'HealthcareService',
            name: 'Pharmacy counter',
          },
        },
      ],
    });

    assert.equal(bundle.total, 1);
    assert.equal(bundle.entry[0]?.fullUrl, 'HealthcareService/hs-9');
    assert.equal(bundle.entry[0]?.resource.id, 'hs-9');
  });

  it('skips missing resources', () => {
    const bundle = buildProviderFhirBundle({
      organizationId: 'org-1',
      organizationResource: null,
      locationId: 'loc-1',
      locationResource: {
        resourceType: 'Location',
        name: 'Only location',
      },
    });

    assert.equal(bundle.total, 1);
    assert.equal(bundle.entry[0]?.fullUrl, 'Location/loc-1');
    assert.equal(bundle.entry[0]?.resource.id, 'loc-1');
  });
});
