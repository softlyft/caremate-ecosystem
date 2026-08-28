import { format } from 'date-fns';
import Link from 'next/link';
import { ThreadReplyForm } from '@/components/features/thread-reply-form';
import { replyOrgMessageAction } from '@/domains/messaging/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export type OrgThreadMessage = {
  id: string;
  sender_party_type: 'user' | 'organization';
  body: string;
  subject: string | null;
  created_at: string;
};

type ReplyOrgMessageAction = typeof replyOrgMessageAction;

export function OrgMessageThread({
  inboxHref,
  patientName,
  patientCaremateId,
  messages,
  orgSenderLabel,
  canWrite,
  conversationId,
  replyAction = replyOrgMessageAction,
}: {
  inboxHref: string;
  patientName: string | null;
  patientCaremateId: string | null;
  messages: OrgThreadMessage[];
  orgSenderLabel: string;
  canWrite: boolean;
  conversationId: string;
  replyAction?: ReplyOrgMessageAction;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link href={inboxHref} className="text-sm text-muted hover:underline">
            ← Inbox
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-brand-navy">{patientName ?? 'Patient'}</h1>
          <p className="text-sm text-muted">{patientCaremateId ?? '—'}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conversation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted">No messages yet.</p>
          ) : (
            messages.map((m) => {
              const fromOrg = m.sender_party_type === 'organization';
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
                    {fromOrg ? orgSenderLabel : 'Patient'} ·{' '}
                    {format(new Date(m.created_at), 'MMM d, HH:mm')}
                  </p>
                </div>
              );
            })
          )}
          {canWrite ? (
            <ThreadReplyForm conversationId={conversationId} replyAction={replyAction} />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
