/** Explicit CareMate AI model deadline (leaves room under Lambda for cold start + DB). */
export const MODEL_REQUEST_TIMEOUT_MS = 20_000;

export class AiModelTimeoutError extends Error {
  readonly code = 'model_timeout' as const;

  constructor(timeoutMs: number = MODEL_REQUEST_TIMEOUT_MS) {
    super(`CareMate AI model request timed out after ${timeoutMs}ms`);
    this.name = 'AiModelTimeoutError';
  }
}

export class AiModelProviderError extends Error {
  readonly code = 'model_provider_error' as const;

  constructor(message: string) {
    super(message);
    this.name = 'AiModelProviderError';
  }
}

export function isAiModelTimeoutError(
  err: unknown,
): err is AiModelTimeoutError {
  return err instanceof AiModelTimeoutError;
}

export function classifyModelError(
  err: unknown,
): AiModelTimeoutError | AiModelProviderError {
  if (err instanceof AiModelTimeoutError) {
    return err;
  }
  if (err instanceof AiModelProviderError) {
    return err;
  }

  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();
  if (
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    lower.includes('aborted') ||
    lower.includes('deadline')
  ) {
    return new AiModelTimeoutError();
  }

  return new AiModelProviderError(
    message.slice(0, 200) || 'CareMate AI model request failed',
  );
}

export async function withModelTimeout<T>(
  work: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number = MODEL_REQUEST_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await Promise.race([
      work(controller.signal),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener(
          'abort',
          () => reject(new AiModelTimeoutError(timeoutMs)),
          { once: true },
        );
      }),
    ]);
  } catch (err) {
    throw classifyModelError(err);
  } finally {
    clearTimeout(timer);
  }
}
