'use client';

import { format } from 'date-fns';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { CareCoordinationStaffPanel } from '@/components/features/care-coordination-staff-panel';
import { ThreadReplyForm } from '@/components/features/thread-reply-form';
import { replyOrgMessageAction } from '@/domains/messaging/actions';
import {
  fetchOrgThreadMessages,
  type OrgThreadMessage,
} from '@/domains/messaging/client-messages';
import type { CareCoordinationStaffCandidate } from '@/domains/messaging/care-coordination';
import { useOrgMessageThreadRealtime } from '@/domains/messaging/use-org-message-thread-realtime';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export type { OrgThreadMessage };

type ReplyOrgMessageAction = typeof replyOrgMessageAction;
type AddStaffAction = (formData: FormData) => Promise<void>;

function senderLabel(
  message: OrgThreadMessage,
  options: {
    conversationKind: 'org_patient' | 'care_coordination';
    orgSenderLabel: string;
    payerSenderLabel: string;
  },
): string {
  if (message.sender_party_type === 'organization') {
    if (message.sender_payer_organization_id) return options.payerSenderLabel;
    return options.orgSenderLabel;
  }
  if (options.conversationKind === 'care_coordination') {
    return 'Participant';
  }
  return 'Patient';
}

export function OrgMessageThread({
  inboxHref,
  patientName,
  patientCaremateId,
  messages: initialMessages,
  orgSenderLabel,
  payerSenderLabel = 'Insurer',
  canWrite,
  conversationId,
  conversationKind = 'org_patient',
  partnerOrgName,
  staffCandidates = [],
  addStaffAction,
  replyAction = replyOrgMessageAction,
}: {
  inboxHref: string;
  patientName: string | null;
  patientCaremateId: string | null;
  messages: OrgThreadMessage[];
  orgSenderLabel: string;
  payerSenderLabel?: string;
  canWrite: boolean;
  conversationId: string;
  conversationKind?: 'org_patient' | 'care_coordination';
  partnerOrgName?: string | null;
  staffCandidates?: CareCoordinationStaffCandidate[];
  addStaffAction?: AddStaffAction;
  replyAction?: ReplyOrgMessageAction;
}) {
  const [messages, setMessages] = useState(initialMessages);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  const refreshMessages = useCallback(async () => {
    try {
      const next = await fetchOrgThreadMessages(conversationId);
      setMessages(next);
    } catch {
      // Realtime may fire before RLS-visible rows; ignore transient fetch errors.
    }
  }, [conversationId]);

  useOrgMessageThreadRealtime(conversationId, refreshMessages);

  const isCoordination = conversationKind === 'care_coordination';

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link href={inboxHref} className="text-sm text-muted hover:underline">
            ← Inbox
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-brand-navy">{patientName ?? 'Patient'}</h1>
            {isCoordination ? <Badge variant="secondary">Care team</Badge> : null}
          </div>
          <p className="text-sm text-muted">{patientCaremateId ?? '—'}</p>
          {isCoordination && partnerOrgName ? (
            <p className="mt-1 text-sm text-muted">With {partnerOrgName}</p>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isCoordination ? 'Care team conversation' : 'Conversation'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted">No messages yet.</p>
          ) : (
            messages.map((m) => {
              const fromOrg = m.sender_party_type === 'organization';
              const label = senderLabel(m, {
                conversationKind,
                orgSenderLabel,
                payerSenderLabel,
              });
              return (
                <div
                  key={m.id}
                  className={`rounded-xl px-3 py-2 text-sm ${
                    fromOrg
                      ? 'ml-8 bg-teal-50 text-brand-navy'
                      : 'mr-8 bg-slate-100 text-slate-800'
                  }`}
                >
                  {m.subject ? (
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal-800">
                      {m.subject}
                    </p>
                  ) : null}
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className="mt-1 text-[11px] text-muted">
                    {label} · {format(new Date(m.created_at), 'MMM d, HH:mm')}
                  </p>
                </div>
              );
            })
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
