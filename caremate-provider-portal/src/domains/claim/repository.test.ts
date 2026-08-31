import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  generateClaimCode,
  hashClaimCode,
  normalizeEmail,
  selectClaimableOrgs,
} from '@/domains/claim/repository';
import {
  careKindFromPortalPath,
  resolveCareHomePath,
  sanitizePostLoginPath,
} from '@/lib/safe-redirect';

describe('claim helpers', () => {
  it('normalizes email', () => {
    assert.equal(normalizeEmail('  Ada@Example.COM '), 'ada@example.com');
    assert.equal(normalizeEmail('  Chanc.eski7+tag@Gmail.COM '), 'chanceski7@gmail.com');
    assert.equal(normalizeEmail('user.name@googlemail.com'), 'username@gmail.com');
  });

  it('hashes claim codes stably', () => {
    assert.equal(hashClaimCode('123456'), hashClaimCode('123456'));
    assert.notEqual(hashClaimCode('123456'), hashClaimCode('654321'));
  });

  it('generates a 6-digit code', () => {
    const code = generateClaimCode();
    assert.match(code, /^\d{6}$/);
  });
});

describe('selectClaimableOrgs', () => {
  it('keeps only orgs with zero active members (provider + payer path)', () => {
    const orgs = [
      { id: 'a', name: 'Unclaimed Payer' },
      { id: 'b', name: 'Claimed Payer' },
      { id: 'c', name: 'Also Unclaimed' },
    ];
    const counts = new Map<string, number>([
      ['a', 0],
      ['b', 2],
      ['c', 0],
    ]);
    assert.deepEqual(selectClaimableOrgs(orgs, counts), [
      { id: 'a', name: 'Unclaimed Payer' },
      { id: 'c', name: 'Also Unclaimed' },
    ]);
  });

  it('treats missing counts as zero (claimable)', () => {
    assert.deepEqual(
      selectClaimableOrgs([{ id: 'x', name: 'Solo' }], new Map()),
      [{ id: 'x', name: 'Solo' }],
    );
  });
});

describe('sanitizePostLoginPath', () => {
  it('allows relative /app and /payer paths', () => {
    assert.equal(sanitizePostLoginPath(null), '/app/dashboard');
    assert.equal(sanitizePostLoginPath('/app/messages'), '/app/messages');
    assert.equal(sanitizePostLoginPath('/payer/dashboard'), '/payer/dashboard');
    assert.equal(sanitizePostLoginPath('/payer/organization'), '/payer/organization');
    assert.equal(sanitizePostLoginPath(null, '/payer/dashboard'), '/payer/dashboard');
    assert.equal(sanitizePostLoginPath('https://evil.example'), '/app/dashboard');
    assert.equal(sanitizePostLoginPath('//evil.example'), '/app/dashboard');
    assert.equal(sanitizePostLoginPath('/login'), '/app/dashboard');
    assert.equal(sanitizePostLoginPath('/app/../login'), '/app/dashboard');
    assert.equal(sanitizePostLoginPath('/claim'), '/app/dashboard');
  });
});

describe('careKindFromPortalPath', () => {
  it('maps sanitized portal paths to workspace kind', () => {
    assert.equal(careKindFromPortalPath('/app/dashboard'), 'provider');
    assert.equal(careKindFromPortalPath('/app/messages'), 'provider');
    assert.equal(careKindFromPortalPath('/payer/dashboard'), 'payer');
    assert.equal(careKindFromPortalPath('/payer/organization'), 'payer');
  });
});

describe('resolveCareHomePath', () => {
  it('routes by membership and preferred kind', () => {
    assert.equal(
      resolveCareHomePath({ hasProvider: true, hasPayer: false }),
      '/app/dashboard',
    );
    assert.equal(
      resolveCareHomePath({ hasProvider: false, hasPayer: true }),
      '/payer/dashboard',
    );
    assert.equal(
      resolveCareHomePath({ hasProvider: true, hasPayer: true }),
      '/app/dashboard',
    );
    assert.equal(
      resolveCareHomePath({
        hasProvider: true,
        hasPayer: true,
        preferredKind: 'payer',
      }),
      '/payer/dashboard',
    );
  });
});
