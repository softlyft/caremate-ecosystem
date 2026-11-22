/** Map GoTrue / Auth login errors to portal-safe copy. */
export function toPortalLoginErrorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message ?? '')
          : '';

  if (/banned/i.test(message)) {
    return 'This account has been disabled. Contact support.';
  }

  return message.trim() || 'Login failed';
}
