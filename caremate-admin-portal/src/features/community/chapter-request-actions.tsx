'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  approveChapterRequest,
  rejectChapterRequest,
} from '@/domains/community/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ChapterRequestActions({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [pendingAction, setPendingAction] = useState<'approve' | 'reject' | null>(null);
  const [note, setNote] = useState('');

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        className="max-w-xs"
        placeholder="Review note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        disabled={pending}
      />
      <Button
        size="sm"
        disabled={pending}
        loading={pendingAction === 'approve'}
        loadingLabel="Approving…"
        onClick={() =>
          start(async () => {
            setPendingAction('approve');
            try {
              await approveChapterRequest(requestId, note || null);
              toast.success('Chapter request approved');
              router.refresh();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Approve failed');
            } finally {
              setPendingAction(null);
            }
          })
        }
      >
        Approve
      </Button>
      <Button
        size="sm"
        variant="danger"
        disabled={pending}
        loading={pendingAction === 'reject'}
        loadingLabel="Rejecting…"
        onClick={() =>
          start(async () => {
            setPendingAction('reject');
            try {
              await rejectChapterRequest(requestId, note || null);
              toast.success('Chapter request rejected');
              router.refresh();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Reject failed');
            } finally {
              setPendingAction(null);
            }
          })
        }
      >
        Reject
      </Button>
    </div>
  );
}
