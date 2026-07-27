import { createClient } from '@/lib/supabase/server';

const GATEWAY_TIMEOUT_MS = 12_000;

export function isHealthDataGatewayConfigured(): boolean {
  return Boolean(process.env.HEALTH_DATA_GATEWAY_URL?.trim());
}

export class HealthDataGatewayError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'HealthDataGatewayError';
  }
}

/**
 * Call the Health Data Gateway with the signed-in portal user's JWT.
 * Returns `null` when the gateway URL is unset (caller may use plaintext Supabase).
 */
export async function gatewayRequest<T>(
  method: 'GET' | 'PUT' | 'POST' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T | null> {
  const base = process.env.HEALTH_DATA_GATEWAY_URL?.trim();
  if (!base) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new HealthDataGatewayError('Sign in required to use the health data gateway');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GATEWAY_TIMEOUT_MS);

  try {
    const response = await fetch(`${base.replace(/\/$/, '')}${path}`, {
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
        // ignore
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
