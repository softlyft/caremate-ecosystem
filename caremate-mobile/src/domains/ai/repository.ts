import {
  gatewayRequest,
  HealthDataGatewayError,
  isHealthDataGatewayConfigured,
} from '@/domains/health-data-gateway/client';
import type {
  AiConversation,
  AiConversationDetail,
  AiPostMessageResult,
} from '@/domains/ai/types';

/**
 * Client wait budget under HDG Lambda (45s) and after the 20s model deadline.
 * Keep below Lambda so the gateway can mark the turn failed before the client aborts.
 */
const AI_GATEWAY_TIMEOUT_MS = 40_000;

async function aiGatewayRequest<T>(
  method: 'GET' | 'PUT' | 'POST' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  if (!isHealthDataGatewayConfigured()) {
    throw new HealthDataGatewayError('CareMate AI requires the health data gateway');
  }

  // Local override of timeout for long model calls without changing PHI paths.
  const { config } = await import('@/constants/env');
  const { supabase } = await import('@/lib/supabase');
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new HealthDataGatewayError('Sign in required for CareMate AI');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_GATEWAY_TIMEOUT_MS);
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
      let detail = '';
      try {
        const errBody = (await response.json()) as { message?: string | string[] };
        if (errBody?.message) {
          detail = `: ${Array.isArray(errBody.message) ? errBody.message.join(', ') : errBody.message}`;
        }
      } catch {
        // ignore
      }
      throw new HealthDataGatewayError(
        `CareMate AI ${method} ${path} failed (${response.status})${detail}`,
        response.status,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof HealthDataGatewayError) {
      throw error;
    }
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? 'CareMate AI timed out'
        : error instanceof Error
          ? error.message
          : 'CareMate AI request failed';
    throw new HealthDataGatewayError(message);
  } finally {
    clearTimeout(timeout);
  }
}

export async function listAiConversations(): Promise<AiConversation[]> {
  const data = await aiGatewayRequest<AiConversation[]>('GET', '/v1/ai/conversations');
  return data ?? [];
}

export async function createAiConversation(title?: string): Promise<AiConversation> {
  return aiGatewayRequest<AiConversation>('POST', '/v1/ai/conversations', {
    title: title ?? 'CareMate AI',
  });
}

export async function getAiConversation(id: string): Promise<AiConversationDetail> {
  return aiGatewayRequest<AiConversationDetail>('GET', `/v1/ai/conversations/${id}`);
}

export async function postAiMessage(
  conversationId: string,
  content: string,
  clientRequestId: string,
): Promise<AiPostMessageResult> {
  return aiGatewayRequest<AiPostMessageResult>(
    'POST',
    `/v1/ai/conversations/${conversationId}/messages`,
    { content, clientRequestId },
  );
}

export async function submitAiFeedback(
  messageId: string,
  rating: 'up' | 'down',
): Promise<void> {
  await aiGatewayRequest('POST', `/v1/ai/messages/${messageId}/feedback`, { rating });
}

export async function deleteAiConversation(id: string): Promise<void> {
  await aiGatewayRequest('DELETE', `/v1/ai/conversations/${id}`);
}

/** Ensure the user has an active AI conversation; create one if needed. */
export async function ensureAiConversation(): Promise<AiConversation> {
  const existing = await listAiConversations();
  if (existing[0]) {
    return existing[0];
  }
  return createAiConversation();
}

/** Used by inbox pin preview — best-effort; returns null if AI unavailable. */
export async function peekLatestAiConversation(): Promise<AiConversation | null> {
  try {
    if (!isHealthDataGatewayConfigured()) {
      return null;
    }
    const list = await gatewayRequest<AiConversation[]>('GET', '/v1/ai/conversations');
    return list?.[0] ?? null;
  } catch {
    return null;
  }
}
