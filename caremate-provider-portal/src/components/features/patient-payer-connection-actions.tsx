'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  approvePatientConnectionAsPayerAction,
  cancelPatientConnectionAsPayerAction,
  disconnectPatientConnectionAsPayerAction,
  rejectPatientConnectionAsPayerAction,
} from '@/domains/patient-payer-connections/actions';
import { mapPatientPayerConnectionError } from '@/domains/patient-payer-connections/errors';

type PatientPayerConnectionActionMode = 'inbound-pending' | 'outbound-pending' | 'approved';

export function PatientPayerConnectionActions({
  connectionId,
  mode,
  /** @deprecated Use `mode` instead. */
  showApprove = true,
}: {
  connectionId: string;
  mode?: PatientPayerConnectionActionMode;
  /** Hide for outbound rows awaiting the patient. */
  showApprove?: boolean;
}) {
  const resolvedMode: PatientPayerConnectionActionMode =
    mode ?? (showApprove ? 'inbound-pending' : 'outbound-pending');

  const [pending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<
    'approve' | 'reject' | 'cancel' | 'disconnect' | null
  >(null);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState('');

  const reasonRequired = resolvedMode !== 'approved';
  const primaryLabel =
    resolvedMode === 'inbound-pending'
      ? 'Reject'
      : resolvedMode === 'outbound-pending'
        ? 'Cancel'
        : 'Disconnect';

  function submitReasonAction() {
    const trimmed = reason.trim();
    if (reasonRequired && !trimmed) {
      toast.error('Please enter a reason for rejection');
      return;
    }

    startTransition(async () => {
      const action =
        resolvedMode === 'inbound-pending'
          ? 'reject'
          : resolvedMode === 'outbound-pending'
            ? 'cancel'
            : 'disconnect';
      setPendingAction(action);
      try {
        if (resolvedMode === 'inbound-pending') {
          await rejectPatientConnectionAsPayerAction(connectionId, trimmed);
          toast.success('Connection rejected');
        } else if (resolvedMode === 'outbound-pending') {
          await cancelPatientConnectionAsPayerAction(connectionId, trimmed);
          toast.success('Request cancelled');
        } else {
          await disconnectPatientConnectionAsPayerAction(connectionId, trimmed || undefined);
          toast.success('Connection ended');
        }
        setReasonOpen(false);
        setReason('');
      } catch (err) {
        toast.error(mapPatientPayerConnectionError(err, `Failed to ${primaryLabel.toLowerCase()}`));
      } finally {
        setPendingAction(null);
      }
    });
  }

  return (
    <div className="flex min-w-[12rem] flex-col items-end gap-2">
      <div className="flex gap-2">
        {resolvedMode === 'inbound-pending' ? (
          <Button
            size="sm"
            disabled={pending || reasonOpen}
            loading={pendingAction === 'approve'}
            loadingLabel="Approving…"
            onClick={() =>
              startTransition(async () => {
                setPendingAction('approve');
                try {
                  await approvePatientConnectionAsPayerAction(connectionId);
                  toast.success('Connection approved');
                } catch (err) {
                  toast.error(mapPatientPayerConnectionError(err, 'Failed to approve'));
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
          onClick={() => setReasonOpen((open) => !open)}
        >
          {primaryLabel}
        </Button>
      </div>
      {reasonOpen ? (
        <div className="w-64 space-y-2 rounded-md border border-border bg-white p-3 shadow-sm">
          <Label htmlFor={`ppc-patient-reason-${connectionId}`}>
            {reasonRequired ? 'Reason (required)' : 'Reason (optional)'}
          </Label>
          <Textarea
            id={`ppc-patient-reason-${connectionId}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder={
              resolvedMode === 'approved'
                ? 'Why is this connection being ended?'
                : 'Why is this request being declined?'
            }
            disabled={pending}
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => {
                setReasonOpen(false);
                setReason('');
              }}
            >
              Back
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={pending}
              loading={pendingAction !== null && pendingAction !== 'approve'}
              loadingLabel="Confirming…"
              onClick={submitReasonAction}
            >
              Confirm
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
