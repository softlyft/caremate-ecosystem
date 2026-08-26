/** Map Postgres/RPC errors from patient↔payer connection flows to UI copy. */
export function mapPatientPayerConnectionError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : String(err ?? '');
  const lower = message.toLowerCase();

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
  if (lower.includes('only the patient') || lower.includes('only payer staff')) {
    return 'Only the other party can respond to this request.';
  }

  return message.trim() || fallback;
}
