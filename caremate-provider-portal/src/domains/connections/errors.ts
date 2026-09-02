/** Map Postgres/RPC errors from patient↔provider connection flows to UI copy. */
export function mapProviderPatientConnectionError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : String(err ?? '');
  const lower = message.toLowerCase();

  if (lower.includes('patient connection limit') || lower.includes('connect more patients')) {
    return 'Patient connection limit reached on your current plan. Upgrade in Settings → Billing.';
  }
  if (lower.includes('previously') && lower.includes('declined')) {
    return 'A previous connection request was declined. Multiple requests are not allowed.';
  }
  if (lower.includes('already pending')) {
    return 'A connection request is already pending.';
  }
  if (lower.includes('already connected')) {
    return 'You are already connected with this patient.';
  }
  if (lower.includes('no patient found')) {
    return 'No patient found with that CareMate ID.';
  }
  if (lower.includes('valid 12-digit')) {
    return 'Enter a valid 12-digit CareMate ID.';
  }
  if (lower.includes('must be verified')) {
    return 'Your organization must be verified before connecting.';
  }
  if (lower.includes('not authorized') || lower.includes('forbidden')) {
    return 'You do not have permission to perform this action.';
  }
  if (lower.includes('rejection reason') || lower.includes('cancellation reason')) {
    return 'A reason is required.';
  }
  if (lower.includes('only the patient') || lower.includes('only provider staff')) {
    return 'Only the other party can respond to this request.';
  }
  if (lower.includes('already approved')) {
    return 'This request was already approved. Check Connected patients — your list will refresh.';
  }
  if (lower.includes('only pending or approved')) {
    return 'Connection approval failed during consent sync. Deploy the latest database migration and try again.';
  }
  if (lower.includes('only pending')) {
    return 'This request was already processed. Your list will refresh.';
  }

  return message.trim() || fallback;
}
