'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { replyOrgMessageAction } from '@/domains/messaging/actions';

export function ThreadReplyForm({ conversationId }: { conversationId: string }) {
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState('');

  return (
    <form
      className="space-y-3 border-t border-border pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = body.trim();
        if (!trimmed) return;
        const formData = new FormData();
        formData.set('conversation_id', conversationId);
        formData.set('body', trimmed);
        startTransition(async () => {
          try {
            await replyOrgMessageAction(formData);
            setBody('');
            toast.success('Reply sent');
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to send reply');
          }
        });
      }}
    >
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a reply to the patient…"
        rows={3}
        required
      />
      <div className="flex justify-end">
        <Button type="submit" loading={pending} loadingLabel="Sending…" disabled={!body.trim()}>
          Send reply
        </Button>
      </div>
    </form>
  );
}
