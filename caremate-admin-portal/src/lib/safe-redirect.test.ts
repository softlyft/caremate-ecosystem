import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { sanitizePostLoginPath } from '@/lib/safe-redirect';
import { isSafeExternalUrl } from '@/lib/safe-url';

describe('sanitizePostLoginPath', () => {
  it('allows only relative /dashboard paths', () => {
    assert.equal(sanitizePostLoginPath(null), '/dashboard');
    assert.equal(sanitizePostLoginPath('/dashboard/users'), '/dashboard/users');
    assert.equal(sanitizePostLoginPath('https://evil.example'), '/dashboard');
    assert.equal(sanitizePostLoginPath('//evil.example'), '/dashboard');
    assert.equal(sanitizePostLoginPath('/login'), '/dashboard');
    assert.equal(sanitizePostLoginPath('/dashboard/../login'), '/dashboard');
    assert.equal(sanitizePostLoginPath('/app/dashboard'), '/dashboard');
  });
});

describe('isSafeExternalUrl', () => {
  it('allows https and relative paths; rejects javascript and schemes', () => {
    assert.equal(isSafeExternalUrl('https://example.com/path'), true);
    assert.equal(isSafeExternalUrl('/dashboard/ads'), true);
    assert.equal(isSafeExternalUrl('javascript:alert(1)'), false);
    assert.equal(isSafeExternalUrl('data:text/html,hi'), false);
    assert.equal(isSafeExternalUrl('//evil.example'), false);
    assert.equal(isSafeExternalUrl('http://insecure.example'), false);
  });
});
