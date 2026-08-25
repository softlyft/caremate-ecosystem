import { describe, expect, it } from 'vitest';
import { mapPayerConnectionError } from './errors';

describe('mapPayerConnectionError', () => {
  it('maps one-lifetime decline', () => {
    expect(
      mapPayerConnectionError(
        new Error('A previous connection request was declined. Multiple requests are not allowed.'),
        'fallback',
      ),
    ).toContain('declined');
  });

  it('maps missing verified org', () => {
    expect(
      mapPayerConnectionError(
        new Error('No verified payer found with that claim contact email'),
        'fallback',
      ),
    ).toContain('No verified organization');
  });

  it('maps self-approve block', () => {
    expect(
      mapPayerConnectionError(
        new Error('Only the payer organization can approve this request'),
        'fallback',
      ),
    ).toContain('other organization');
  });

  it('falls back for unknown errors', () => {
    expect(mapPayerConnectionError(new Error(''), 'fallback')).toBe('fallback');
  });
});
