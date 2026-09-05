import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { mapPayerConnectionError } from './errors';

describe('mapPayerConnectionError', () => {
  it('maps one-lifetime decline', () => {
    assert.match(
      mapPayerConnectionError(
        new Error('A previous connection request was declined. Multiple requests are not allowed.'),
        'fallback',
      ),
      /declined/i,
    );
  });

  it('maps missing verified org from Postgrest-shaped object', () => {
    assert.match(
      mapPayerConnectionError(
        { message: 'No verified payer found with that claim contact email', code: 'P0001' },
        'fallback',
      ),
      /No verified organization/,
    );
  });

  it('does not stringify objects as [object Object]', () => {
    const mapped = mapPayerConnectionError(
      { message: 'No verified payer found with that claim contact email' },
      'fallback',
    );
    assert.equal(mapped.includes('[object Object]'), false);
  });

  it('maps self-approve block', () => {
    assert.match(
      mapPayerConnectionError(
        new Error('Only the payer organization can approve this request'),
        'fallback',
      ),
      /other organization/,
    );
  });

  it('falls back for unknown errors', () => {
    assert.equal(mapPayerConnectionError(new Error(''), 'fallback'), 'fallback');
  });
});
