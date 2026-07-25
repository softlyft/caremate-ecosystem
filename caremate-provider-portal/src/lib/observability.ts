type LogMeta = Record<string, unknown>;

function serializeError(err: unknown): { message: string; name?: string; stack?: string } {
  if (err instanceof Error) {
    return { message: err.message, name: err.name, stack: err.stack };
  }
  return { message: String(err) };
}

function emit(level: 'info' | 'warn' | 'error', scope: string, message: string, meta?: LogMeta) {
  const line = JSON.stringify({
    level,
    scope,
    message,
    ts: new Date().toISOString(),
    ...meta,
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.info(line);
}

export function logInfo(scope: string, message: string, meta?: LogMeta) {
  emit('info', scope, message, meta);
}

export function logWarn(scope: string, message: string, meta?: LogMeta) {
  emit('warn', scope, message, meta);
}

export function logError(scope: string, err: unknown, meta?: LogMeta) {
  emit('error', scope, serializeError(err).message, {
    ...meta,
    error: serializeError(err),
  });
  void reportToSentry(err, { scope, ...meta });
}

/** Capture exceptions when SENTRY_DSN is configured (lazy @sentry/node). */
async function reportToSentry(err: unknown, meta?: LogMeta) {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;

  try {
    const Sentry = await import('@sentry/node');
    if (!(globalThis as { __caremateSentryInit?: boolean }).__caremateSentryInit) {
      Sentry.init({
        dsn,
        environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
        tracesSampleRate: 0.05,
      });
      (globalThis as { __caremateSentryInit?: boolean }).__caremateSentryInit = true;
    }
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
      extra: meta,
    });
  } catch {
    // Optional dependency / init failure must not break request path.
  }
}

export async function captureException(err: unknown, meta?: LogMeta) {
  logError('capture', err, meta);
}
