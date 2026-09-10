import { extractErrorMessage } from '@/lib/rpc-error';

const REJECTED_CONFIRM_PREFIX = 'CONNECTION_REJECTED_NEEDS_CONFIRM:';

export type RejectedResendPrompt = {
  needsResendConfirm: true;
  rejectionReason: string | null;
};

/** Parse RPC signal that a rejected connection exists and the client must confirm resend. */
export function parseRejectedResendPrompt(err: unknown): RejectedResendPrompt | null {
  const message = extractErrorMessage(err, '');
  const markerIndex = message.indexOf(REJECTED_CONFIRM_PREFIX);
  if (markerIndex < 0) {
    return null;
  }
  const reason = message.slice(markerIndex + REJECTED_CONFIRM_PREFIX.length).trim();
  return {
    needsResendConfirm: true,
    rejectionReason: reason.length > 0 ? reason : null,
  };
}

/** Map Postgres/RPC errors from provider↔payer connection flows to UI copy. */
export function mapPayerConnectionError(err: unknown, fallback: string): string {
  if (parseRejectedResendPrompt(err)) {
    return 'This organization already rejected your initial request. Confirm to resend.';
  }

  const message = extractErrorMessage(err, fallback);
  const lower = message.toLowerCase();

  if (lower.includes('previous') && lower.includes('declined')) {
    return 'This organization already rejected your initial request. Confirm to resend.';
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
  if (lower.includes('rejection reason') || lower.includes('cancellation reason')) {
    return 'A reason is required.';
  }
  if (lower.includes('only the payer') || lower.includes('only the provider')) {
    return 'Only the other organization can approve this request.';
  }

  return message.trim() || fallback;
}

export function buildRejectedResendConfirmMessage(rejectionReason: string | null): string {
  const lines = [
    'This organization already rejected your initial request. Do you want to resend?',
  ];
  if (rejectionReason) {
    lines.push('', `Rejection reason: ${rejectionReason}`);
  }
  return lines.join('\n');
}
