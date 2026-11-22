import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toPortalLoginErrorMessage } from '@/lib/auth-errors';

describe('toPortalLoginErrorMessage', () => {
  it('maps banned Auth errors to disabled-account copy', () => {
    assert.equal(
      toPortalLoginErrorMessage(new Error('User is banned')),
      'This account has been disabled. Contact support.',
    );
  });

  it('passes through other Auth errors', () => {
    assert.equal(
      toPortalLoginErrorMessage(new Error('Invalid login credentials')),
      'Invalid login credentials',
    );
  });

  it('falls back when message is empty', () => {
    assert.equal(toPortalLoginErrorMessage(new Error('')), 'Login failed');
  });
});
