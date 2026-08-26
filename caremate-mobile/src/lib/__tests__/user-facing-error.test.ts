import {
  extractErrorMessage,
  isNetworkError,
  isNetworkErrorMessage,
  toUserFacingErrorMessage,
} from '@/lib/user-facing-error';

describe('user-facing-error', () => {
  const networkFallback = 'No internet connection. Check your connection and try again.';

  it('detects Android ConnectException with host/IP leakage', () => {
    const message =
      'java.net.ConnectException: Failed to connect to abcdefgh.supabase.co/1.2.3.4:443';
    expect(isNetworkErrorMessage(message)).toBe(true);
    expect(toUserFacingErrorMessage(new Error(message), 'fallback', networkFallback)).toBe(
      networkFallback,
    );
  });

  it('detects common fetch / DNS failures', () => {
    expect(isNetworkErrorMessage('Network request failed')).toBe(true);
    expect(isNetworkErrorMessage('Failed to fetch')).toBe(true);
    expect(isNetworkErrorMessage('Unable to resolve host xyz.supabase.co')).toBe(true);
    expect(isNetworkErrorMessage('UnknownHostException')).toBe(true);
  });

  it('keeps normal auth errors intact', () => {
    expect(
      toUserFacingErrorMessage(new Error('User already registered'), 'fallback', networkFallback),
    ).toBe('User already registered');
    expect(
      toUserFacingErrorMessage(new Error('Invalid login credentials'), 'fallback', networkFallback),
    ).toBe('Invalid login credentials');
  });

  it('does not treat redirect allowlist errors as offline', () => {
    const message =
      'Redirect URL "exp://192.168.1.12:8081/--/auth/reset-password" is not allowed for this request';
    expect(isNetworkErrorMessage(message)).toBe(false);
    expect(toUserFacingErrorMessage(new Error(message), 'fallback', networkFallback)).toBe(
      'fallback',
    );
  });

  it('still maps ConnectException host leakage to the network message', () => {
    const message =
      'java.net.ConnectException: Failed to connect to abcdefgh.supabase.co/1.2.3.4:443';
    expect(isNetworkErrorMessage(message)).toBe(true);
    expect(toUserFacingErrorMessage(new Error(message), 'fallback', networkFallback)).toBe(
      networkFallback,
    );
  });

  it('reads nested cause messages', () => {
    const error = new Error('fetch failed');
    (error as Error & { cause: Error }).cause = new Error(
      'java.net.ConnectException: Failed to connect to example.supabase.co/10.0.0.1:443',
    );
    expect(isNetworkError(error)).toBe(true);
    expect(extractErrorMessage(error)).toContain('ConnectException');
  });

  it('uses fallback when the message is empty', () => {
    expect(toUserFacingErrorMessage(null, 'fallback', networkFallback)).toBe('fallback');
    expect(toUserFacingErrorMessage(new Error('   '), 'fallback', networkFallback)).toBe(
      'fallback',
    );
  });
});
