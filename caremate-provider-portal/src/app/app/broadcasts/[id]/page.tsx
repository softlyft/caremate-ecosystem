import { format } from 'date-fns';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireProviderSession } from '@/lib/auth';
import {
  listConversationMessages,
  listOrgConversations,
} from '@/domains/messaging/repository';
import { createClient } from '@/lib/supabase/server';
import { canWriteOrg } from '@/constants/roles';
import { ThreadReplyForm } from '@/components/features/thread-reply-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function BroadcastThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireProviderSession();
  const orgId = session.activeOrganizationId;
  const canWrite = canWriteOrg(session.activeRole);

  const conversations = await listOrgConversations(orgId);
  const conversation = conversations.find((c) => c.id === id);
  if (!conversation) notFound();

  const messages = await listConversationMessages(orgId, id);

  const supabase = await createClient();
  // Mark org side as read
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;
  await client
    .from('message_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', id)
    .eq('party_type', 'organization')
    .eq('organization_id', orgId);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link href="/app/broadcasts" className="text-sm text-muted hover:underline">
            ← Inbox
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-brand-navy">
            {conversation.patient_name ?? 'Patient'}
          </h1>
          <p className="text-sm text-muted">{conversation.patient_caremate_id ?? '—'}</p>
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
                    {fromOrg ? 'Clinic' : 'Patient'} ·{' '}
                    {format(new Date(m.created_at), 'MMM d, HH:mm')}
                  </p>
                </div>
              );
            })
          )}
          {canWrite ? <ThreadReplyForm conversationId={id} /> : null}
        </CardContent>
      </Card>
    </div>
  );
}
