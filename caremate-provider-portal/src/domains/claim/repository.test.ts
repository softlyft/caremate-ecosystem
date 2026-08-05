import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  generateClaimCode,
  hashClaimCode,
  normalizeEmail,
} from '@/domains/claim/crypto';
import { sanitizePostLoginPath } from '@/lib/safe-redirect';

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

describe('sanitizePostLoginPath', () => {
  it('allows only relative /app paths', () => {
    assert.equal(sanitizePostLoginPath(null), '/app/dashboard');
    assert.equal(sanitizePostLoginPath('/app/messages'), '/app/messages');
    assert.equal(sanitizePostLoginPath('https://evil.example'), '/app/dashboard');
    assert.equal(sanitizePostLoginPath('//evil.example'), '/app/dashboard');
    assert.equal(sanitizePostLoginPath('/login'), '/app/dashboard');
    assert.equal(sanitizePostLoginPath('/app/../login'), '/app/dashboard');
    assert.equal(sanitizePostLoginPath('/claim'), '/app/dashboard');
  });
});
