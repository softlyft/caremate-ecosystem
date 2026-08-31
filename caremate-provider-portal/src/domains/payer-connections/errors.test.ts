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

  it('maps missing verified org', () => {
    assert.match(
      mapPayerConnectionError(
        new Error('No verified payer found with that claim contact email'),
        'fallback',
      ),
      /No verified organization/,
    );
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
