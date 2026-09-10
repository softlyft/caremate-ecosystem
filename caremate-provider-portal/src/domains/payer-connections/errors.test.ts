import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRejectedResendConfirmMessage,
  mapPayerConnectionError,
  parseRejectedResendPrompt,
} from './errors';

describe('mapPayerConnectionError', () => {
  it('maps legacy one-lifetime decline to resend copy', () => {
    assert.match(
      mapPayerConnectionError(
        new Error('A previous connection request was declined. Multiple requests are not allowed.'),
        'fallback',
      ),
      /rejected your initial request/i,
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

describe('parseRejectedResendPrompt', () => {
  it('extracts rejection reason from RPC signal', () => {
    assert.deepEqual(
      parseRejectedResendPrompt(
        new Error('CONNECTION_REJECTED_NEEDS_CONFIRM:Not in network'),
      ),
      {
        needsResendConfirm: true,
        rejectionReason: 'Not in network',
      },
    );
  });

  it('returns null reason when none was stored', () => {
    assert.deepEqual(
      parseRejectedResendPrompt(new Error('CONNECTION_REJECTED_NEEDS_CONFIRM:')),
      {
        needsResendConfirm: true,
        rejectionReason: null,
      },
    );
  });

  it('returns null for unrelated errors', () => {
    assert.equal(parseRejectedResendPrompt(new Error('Already pending')), null);
  });
});

describe('buildRejectedResendConfirmMessage', () => {
  it('includes rejection reason when present', () => {
    const message = buildRejectedResendConfirmMessage('Coverage mismatch');
    assert.match(message, /already rejected your initial request/i);
    assert.match(message, /Coverage mismatch/);
  });

  it('omits reason line when absent', () => {
    const message = buildRejectedResendConfirmMessage(null);
    assert.match(message, /Do you want to resend/);
    assert.equal(message.includes('Rejection reason'), false);
  });
});
