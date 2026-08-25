/** Map Postgres/RPC errors from provider↔payer connection flows to UI copy. */
export function mapPayerConnectionError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : String(err ?? '');
  const lower = message.toLowerCase();

  if (lower.includes('previously') && lower.includes('declined')) {
    return 'A previous connection request was declined. Multiple requests are not allowed.';
  }
  if (lower.includes('already pending')) {
    return 'A connection request is already pending.';
  }
  if (lower.includes('already connected')) {
    return 'You are already connected with this organization.';
  }
  if (lower.includes('must be verified')) {
    return 'Both organizations must be verified before connecting.';
  }
  if (lower.includes('no verified payer') || lower.includes('no verified provider')) {
    return 'No verified organization found with that claim contact email.';
  }
  if (lower.includes('not authorized') || lower.includes('forbidden')) {
    return 'You do not have permission to perform this action.';
  }
  if (lower.includes('rejection reason')) {
    return 'A rejection reason is required.';
  }
  if (lower.includes('only the payer') || lower.includes('only the provider')) {
    return 'Only the other organization can approve this request.';
  }

  return message.trim() || fallback;
}
