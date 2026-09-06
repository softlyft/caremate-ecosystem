'use client';

import { format } from 'date-fns';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { CareCoordinationStaffPanel } from '@/components/features/care-coordination-staff-panel';
import { ThreadReplyForm } from '@/components/features/thread-reply-form';
import { replyOrgMessageAction } from '@/domains/messaging/actions';
import {
  fetchOrgThreadMessages,
  type OrgThreadMessage,
} from '@/domains/messaging/client-messages';
import type { CareCoordinationStaffCandidate } from '@/domains/messaging/care-coordination';
import {
  enrichOrgThreadMessages,
  isGroupThread,
  portalThreadHeaderTitle,
  type ThreadDisplayContext,
} from '@/domains/messaging/sender-display';
import { useOrgMessageThreadRealtime } from '@/domains/messaging/use-org-message-thread-realtime';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export type { OrgThreadMessage };

type ReplyOrgMessageAction = typeof replyOrgMessageAction;
type AddStaffAction = (formData: FormData) => Promise<void>;

function MessageBubble({
  message,
  showSender,
}: {
  message: ReturnType<typeof enrichOrgThreadMessages>[number];
  showSender: boolean;
}) {
  const fromOrg = message.sender_party_type === 'organization';
  const sender = message.senderDisplay;

  return (
    <div className={fromOrg ? 'ml-8' : 'mr-8'}>
      {showSender && sender ? (
        <div className="mb-1">
          <p className="text-sm font-semibold text-brand-navy">{sender.name}</p>
          {sender.roleLabel ? (
            <p className="text-xs text-muted lowercase">({sender.roleLabel})</p>
          ) : null}
        </div>
      ) : null}
      <div
        className={`rounded-xl px-3 py-2 text-sm ${
          fromOrg ? 'bg-teal-50 text-brand-navy' : 'bg-slate-100 text-slate-800'
        }`}
      >
        {!showSender && message.subject ? (
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal-800">
            {message.subject}
          </p>
        ) : null}
        <p className="whitespace-pre-wrap">{message.body}</p>
      </div>
      <p className="mt-1 text-[11px] text-muted">
        {format(new Date(message.created_at), 'MMM d, HH:mm')}
      </p>
    </div>
  );
}

export function OrgMessageThread({
  inboxHref,
  patientName,
  patientCaremateId,
  messages: initialMessages,
  canWrite,
  conversationId,
  threadContext,
  staffCandidates = [],
  addStaffAction,
  replyAction = replyOrgMessageAction,
}: {
  inboxHref: string;
  patientName: string | null;
  patientCaremateId: string | null;
  messages: OrgThreadMessage[];
  canWrite: boolean;
  conversationId: string;
  threadContext: ThreadDisplayContext;
  staffCandidates?: CareCoordinationStaffCandidate[];
  addStaffAction?: AddStaffAction;
  replyAction?: ReplyOrgMessageAction;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [prevInitialMessages, setPrevInitialMessages] = useState(initialMessages);
  if (initialMessages !== prevInitialMessages) {
    setPrevInitialMessages(initialMessages);
    setMessages(initialMessages);
  }

  const refreshMessages = useCallback(async () => {
    try {
      const next = await fetchOrgThreadMessages(conversationId);
      setMessages(next);
    } catch {
      // Realtime may fire before RLS-visible rows; ignore transient fetch errors.
    }
  }, [conversationId]);

  useOrgMessageThreadRealtime(conversationId, refreshMessages);

  const isCoordination = isGroupThread(threadContext);
  const showSender = isCoordination;
  const displayMessages = useMemo(
    () => enrichOrgThreadMessages(messages, threadContext),
    [messages, threadContext],
  );

  const headerTitle = portalThreadHeaderTitle({
    conversationKind: threadContext.conversationKind,
    patientName,
    providerOrgName: threadContext.providerOrgName,
    payerOrgName: threadContext.payerOrgName,
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link href={inboxHref} className="text-sm text-muted hover:underline">
            ← Inbox
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-brand-navy">{headerTitle}</h1>
            {isCoordination ? <Badge variant="secondary">Care team</Badge> : null}
          </div>
          {!isCoordination ? (
            <p className="text-sm text-muted">{patientCaremateId ?? '—'}</p>
          ) : (
            <p className="text-sm text-muted">
              {patientName ?? 'Deleted user'}
              {patientCaremateId ? ` · ${patientCaremateId}` : ''}
            </p>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isCoordination ? 'Care team conversation' : 'Conversation'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {displayMessages.length === 0 ? (
            <p className="text-sm text-muted">No messages yet.</p>
          ) : (
            displayMessages.map((message) => (
              <MessageBubble key={message.id} message={message} showSender={showSender} />
            ))
          )}
          {canWrite ? (
            <ThreadReplyForm conversationId={conversationId} replyAction={replyAction} />
          ) : null}
          {isCoordination && canWrite && addStaffAction ? (
            <CareCoordinationStaffPanel
              conversationId={conversationId}
              candidates={staffCandidates}
              addAction={addStaffAction}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
