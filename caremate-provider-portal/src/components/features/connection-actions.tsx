'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { approveConnectionAction, rejectConnectionAction } from '@/domains/connections/actions';

export function ConnectionActions({
  connectionId,
  showApprove = true,
}: {
  connectionId: string;
  /** Hide for outbound (provider-initiated) rows awaiting the patient. */
  showApprove?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');

  function submitReject() {
    const trimmed = reason.trim();
    if (!trimmed) {
      toast.error('Please enter a reason for rejection');
      return;
    }
    startTransition(async () => {
      setPendingAction('reject');
      try {
        await rejectConnectionAction(connectionId, trimmed);
        toast.success(showApprove ? 'Connection rejected' : 'Request cancelled');
        setRejectOpen(false);
        setReason('');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to reject');
      } finally {
        setPendingAction(null);
      }
    });
  }

  return (
    <div className="flex min-w-[12rem] flex-col items-end gap-2">
      <div className="flex gap-2">
        {showApprove ? (
          <Button
            size="sm"
            disabled={pending || rejectOpen}
            loading={pendingAction === 'approve'}
            loadingLabel="Approving…"
            onClick={() =>
              startTransition(async () => {
                setPendingAction('approve');
                try {
                  await approveConnectionAction(connectionId);
                  toast.success('Connection approved');
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Failed to approve');
                } finally {
                  setPendingAction(null);
                }
              })
            }
          >
            Approve
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="danger"
          disabled={pending}
          onClick={() => setRejectOpen((open) => !open)}
        >
          {showApprove ? 'Reject' : 'Cancel'}
        </Button>
      </div>
      {rejectOpen ? (
        <div className="w-64 space-y-2 rounded-md border border-border bg-white p-3 shadow-sm">
          <Label htmlFor={`reject-reason-${connectionId}`}>Reason (required)</Label>
          <Textarea
            id={`reject-reason-${connectionId}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Why is this request being declined?"
            disabled={pending}
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => {
                setRejectOpen(false);
                setReason('');
              }}
            >
              Back
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={pending}
              loading={pendingAction === 'reject'}
              loadingLabel="Confirming…"
              onClick={submitReject}
            >
              Confirm
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
