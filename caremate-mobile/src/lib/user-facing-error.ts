/**
 * Map low-level fetch / OS networking failures to a safe user-facing message.
 * Android often surfaces `java.net.ConnectException` with hostnames and IPs.
 */

const NETWORK_ERROR_PATTERN =
  /Unable to resolve host|UnknownHostException|ConnectException|SocketTimeoutException|SocketException|NetworkRequestException|Network request failed|Failed to fetch|Failed to connect|ENOTFOUND|ECONNREFUSED|ECONNRESET|EHOSTUNREACH|ETIMEDOUT|EAI_AGAIN|NetworkError|cleartext|SSLHandshake|java\.net\.|NSURLError|The Internet connection appears to be offline|offline|timed?\s*out/i;

/** Host / IP leakage that should never be shown in an alert. */
const INTERNAL_ENDPOINT_PATTERN =
  /\b(?:\d{1,3}\.){3}\d{1,3}\b|\.supabase\.co\b|\.supabase\.in\b|:\d{2,5}\b/i;

export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const parts = [error.message];
    const cause = (error as Error & { cause?: unknown }).cause;
    if (cause instanceof Error && cause.message) {
      parts.push(cause.message);
    } else if (typeof cause === 'string' && cause.trim()) {
      parts.push(cause);
    }
    return parts.filter(Boolean).join(' ');
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') {
      return message;
    }
  }
  return '';
}

export function isNetworkErrorMessage(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) {
    return false;
  }
  // Do not treat "contains host/IP/port" alone as offline — Auth redirect errors
  // often include `exp://192.168.x.x:8081/...` and would be mislabeled.
  return NETWORK_ERROR_PATTERN.test(trimmed);
}

export function isNetworkError(error: unknown): boolean {
  return isNetworkErrorMessage(extractErrorMessage(error));
}

function containsInternalEndpoint(message: string): boolean {
  return INTERNAL_ENDPOINT_PATTERN.test(message);
}

/**
 * Returns a friendly network message when the failure looks like connectivity,
 * otherwise the original message (or `fallback` when empty / unsafe to show).
 */
export function toUserFacingErrorMessage(
  error: unknown,
  fallback: string,
  networkMessage: string = fallback,
): string {
  const raw = extractErrorMessage(error).trim();
  if (!raw) {
    return fallback;
  }
  if (isNetworkErrorMessage(raw)) {
    return networkMessage;
  }
  if (containsInternalEndpoint(raw)) {
    return fallback;
  }
  return raw;
}
