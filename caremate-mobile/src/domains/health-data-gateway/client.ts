import { config } from '@/constants/env';
import { supabase } from '@/lib/supabase';

const GATEWAY_TIMEOUT_MS = 8_000;

export class HealthDataGatewayError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'HealthDataGatewayError';
  }
}

/** True when the optional gateway base URL is configured. */
export function isHealthDataGatewayConfigured(): boolean {
  return config.isHealthDataGatewayConfigured;
}

async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/**
 * Call the Health Data Gateway.
 *
 * - Returns `null` only when the gateway URL is unset (caller may use plaintext Supabase).
 * - Throws `HealthDataGatewayError` when configured but auth/network/HTTP fails —
 *   so PHI is never silently written in plaintext after cutover.
 */
export async function gatewayRequest<T>(
  method: 'GET' | 'PUT' | 'POST' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T | null> {
  if (!isHealthDataGatewayConfigured()) {
    return null;
  }

  const token = await getAccessToken();
  if (!token) {
    throw new HealthDataGatewayError('Sign in required to sync via health data gateway');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GATEWAY_TIMEOUT_MS);

  try {
    const response = await fetch(`${config.healthDataGatewayUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    if (response.status === 204 || response.status === 404) {
      return null;
    }

    if (!response.ok) {
      let detail = '';
      try {
        const errBody = (await response.json()) as { message?: string };
        if (errBody?.message) {
          detail = `: ${errBody.message}`;
        }
      } catch {
        // ignore non-JSON error bodies
      }
      throw new HealthDataGatewayError(
        `Health data gateway ${method} ${path} failed (${response.status})${detail}`,
        response.status,
      );
    }

    const text = await response.text();
    if (!text) {
      return null;
    }
    return JSON.parse(text) as T;
  } catch (error) {
    if (error instanceof HealthDataGatewayError) {
      throw error;
    }
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? 'Health data gateway timed out'
        : error instanceof Error
          ? error.message
          : 'Health data gateway request failed';
    throw new HealthDataGatewayError(message);
  } finally {
    clearTimeout(timeout);
  }
}
