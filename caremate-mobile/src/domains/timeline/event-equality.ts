import { parseJson, stringifyJson } from '@/utils/helpers';

export function isUnchangedTimelineEvent(
  previous: {
    kind: string;
    occurredOn: string;
    occurredAt: string | null;
    title: string;
    summary: string;
    payload: string;
    deletedAt: string | null;
  },
  next: {
    kind: string;
    occurredOn: string;
    occurredAt: string | null;
    title: string;
    summary: string;
  },
  payloadJson: string,
): boolean {
  if (previous.deletedAt != null) {
    return false;
  }
  if (
    previous.kind !== next.kind ||
    previous.occurredOn !== next.occurredOn ||
    previous.occurredAt !== next.occurredAt ||
    previous.title !== next.title ||
    previous.summary !== next.summary
  ) {
    return false;
  }
  if (previous.payload === payloadJson) {
    return true;
  }
  return stringifyJson(parseJson(previous.payload, {})) === payloadJson;
}
