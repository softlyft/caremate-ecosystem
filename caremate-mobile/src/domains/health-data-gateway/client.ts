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
 * Call the Health Data Gateway. Returns `null` when the gateway is not configured
 * or is unreachable / errors — callers must fall back to plaintext Supabase.
 */
export async function gatewayRequest<T>(
  method: 'GET' | 'PUT' | 'POST',
  path: string,
  body?: unknown,
): Promise<T | null> {
  if (!isHealthDataGatewayConfigured()) {
    return null;
  }

  const token = await getAccessToken();
  if (!token) {
    return null;
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

    if (!response.ok) {
      return null;
    }

    if (response.status === 204) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
