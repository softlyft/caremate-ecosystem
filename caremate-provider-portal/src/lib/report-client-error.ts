'use server';

import { logError } from '@/lib/observability';

export async function reportClientErrorAction(input: {
  message: string;
  digest?: string;
  stack?: string;
}) {
  logError('client-error', new Error(input.message), {
    digest: input.digest ?? null,
    stack: input.stack ?? null,
  });
}
