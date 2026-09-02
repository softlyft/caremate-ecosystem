import { extractErrorMessage, toUserFacingErrorMessage } from '@/lib/user-facing-error';

type Translate = (key: string) => string;

/** Supabase/PostgREST RPC errors are plain objects — not `instanceof Error`. */
export function normalizeRpcError(error: unknown, fallback: string): Error {
  const message = extractErrorMessage(error).trim();
  if (message) {
    return new Error(message);
  }
  return new Error(fallback);
}

export function throwIfRpcError(
  error: unknown,
  fallback: string,
): asserts error is null | undefined {
  if (error) {
    throw normalizeRpcError(error, fallback);
  }
}

export function requireRpcConversationId(
  payload: Record<string, unknown>,
  context: string,
): string {
  const conversationId = payload.conversation_id;
  if (typeof conversationId === 'string' && conversationId.length > 0) {
    return conversationId;
  }
  throw new Error(`${context}: server did not return a conversation id`);
}

/** Map care coordination RPC errors to i18n keys when we have friendly copy. */
export function careCoordinationErrorKey(error: unknown): string {
  const message = extractErrorMessage(error);
  const lower = message.toLowerCase();

  if (/conversation not found|invalid source conversation/i.test(message)) {
    return 'messages.coordinationConversationNotFound';
  }
  if (/not connected to this provider/i.test(message)) {
    return 'messages.coordinationProviderNotConnected';
  }
  if (/not connected to this payer|not connected to this insurer/i.test(message)) {
    return 'messages.coordinationPayerNotConnected';
  }
  if (/not linked/i.test(message)) {
    return 'messages.coordinationOrgsNotLinked';
  }
  if (/messaging consent required/i.test(message)) {
    return 'messages.coordinationConsentRequired';
  }
  if (/not eligible/i.test(message)) {
    return 'messages.coordinationNotEligible';
  }
  if (/does not exist|could not find the function|42883/i.test(lower)) {
    return 'messages.coordinationNotAvailable';
  }
  if (/message_conversations_kind_check|message_conversations_kind_shape/i.test(lower)) {
    return 'messages.coordinationNotAvailable';
  }
  if (/no approved recipients with messaging consent/i.test(message)) {
    return 'messages.coordinationConsentRequired';
  }

  return 'messages.coordinationStartFailed';
}

export function directMessageErrorKey(error: unknown): string {
  const message = extractErrorMessage(error);
  if (/not connected to this payer/i.test(message)) {
    return 'messages.payerNotConnected';
  }
  if (/messaging consent required/i.test(message)) {
    return 'messages.messagingConsentRequired';
  }
  if (/you cannot message this person/i.test(message)) {
    return 'messages.searchNoResultsMessage';
  }
  return 'messages.startFailedMessage';
}

export function orgInboxMessageErrorKey(error: unknown): string {
  const message = extractErrorMessage(error);
  if (/messaging consent required/i.test(message)) {
    return 'messages.messagingConsentRequired';
  }
  if (/not connected to this payer|not connected to this insurer/i.test(message)) {
    return 'messages.payerNotConnected';
  }
  if (/not connected to this provider/i.test(message)) {
    return 'messages.coordinationProviderNotConnected';
  }
  return 'messages.startFailedMessage';
}

function formatMappedAlert(
  error: unknown,
  mapKey: (error: unknown) => string,
  genericKey: string,
  networkFallbackKey: string,
  t: Translate,
): string {
  const key = mapKey(error);
  if (key !== genericKey) {
    return t(key);
  }
  return toUserFacingErrorMessage(error, t(genericKey), t(networkFallbackKey));
}

export function formatCareCoordinationAlert(error: unknown, t: Translate): string {
  return formatMappedAlert(
    error,
    careCoordinationErrorKey,
    'messages.coordinationStartFailed',
    'messages.sendFailedMessage',
    t,
  );
}

export function formatDirectMessageStartAlert(error: unknown, t: Translate): string {
  return formatMappedAlert(
    error,
    directMessageErrorKey,
    'messages.startFailedMessage',
    'messages.sendFailedMessage',
    t,
  );
}

export function formatOrgInboxMessageAlert(error: unknown, t: Translate): string {
  return formatMappedAlert(
    error,
    orgInboxMessageErrorKey,
    'messages.startFailedMessage',
    'messages.sendFailedMessage',
    t,
  );
}

export function formatCareTeamMessageAlert(
  error: unknown,
  viaOrgInbox: boolean,
  t: Translate,
): string {
  return viaOrgInbox
    ? formatOrgInboxMessageAlert(error, t)
    : formatDirectMessageStartAlert(error, t);
}

export function formatCareCoordinationLoadAlert(error: unknown, t: Translate): string {
  return toUserFacingErrorMessage(
    error,
    t('messages.coordinationLoadFailed'),
    t('messages.sendFailedMessage'),
  );
}
