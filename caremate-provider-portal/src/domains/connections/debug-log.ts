/** Structured server-side logs for connection approve/reject debugging. */
export function logConnectionAction(
  action: 'approve' | 'reject' | 'cancel' | 'disconnect',
  details: Record<string, unknown>,
): void {
  console.error(`[connection:${action}]`, JSON.stringify(details));
}
