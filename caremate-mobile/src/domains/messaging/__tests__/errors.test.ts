import {
  careCoordinationErrorKey,
  formatCareCoordinationAlert,
  formatDirectMessageStartAlert,
  normalizeRpcError,
  orgInboxMessageErrorKey,
} from '@/domains/messaging/errors';

describe('messaging errors', () => {
  const t = (key: string) => key;

  it('extracts message from PostgREST-shaped RPC errors', () => {
    const rpcError = {
      message: 'Messaging consent required',
      code: 'P0001',
      details: null,
      hint: null,
    };
    expect(normalizeRpcError(rpcError, 'fallback').message).toBe('Messaging consent required');
  });

  it('maps known care coordination errors to i18n keys', () => {
    expect(
      careCoordinationErrorKey({ message: 'Provider and payer organizations are not linked' }),
    ).toBe('messages.coordinationOrgsNotLinked');
    expect(
      careCoordinationErrorKey({ message: 'Organization is not eligible for care coordination' }),
    ).toBe('messages.coordinationNotEligible');
  });

  it('returns server text when no friendly key matches', () => {
    const message = formatCareCoordinationAlert(
      { message: 'Could not open care coordination conversation' },
      t,
    );
    expect(message).toBe('Could not open care coordination conversation');
  });

  it('maps org inbox connection errors', () => {
    expect(orgInboxMessageErrorKey({ message: 'Not connected to this insurer' })).toBe(
      'messages.payerNotConnected',
    );
  });

  it('maps direct message consent errors to friendly copy', () => {
    expect(
      formatDirectMessageStartAlert({ message: 'Messaging consent required' }, t),
    ).toBe('messages.messagingConsentRequired');
  });
});
