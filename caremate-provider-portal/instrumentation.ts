export async function register() {
  if (process.env.NEXT_RUNTIME === 'edge') return;
  const { assertPublicEnv } = await import('@/lib/env');
  assertPublicEnv();
}
