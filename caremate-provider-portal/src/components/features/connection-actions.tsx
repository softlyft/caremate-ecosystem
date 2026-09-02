'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FormActions, FormField } from '@/components/ui/form-field';
import {
  providerPatientConnectionHandlers,
  type ConnectionActionHandlers,
} from '@/lib/connection-action-handlers';
import {
  formatConnectionError,
  type ConnectionErrorMapper,
} from '@/lib/connection-error-format';

export type ConnectionActionMode = 'inbound-pending' | 'outbound-pending' | 'approved';

export function ConnectionActions({
  connectionId,
  mode,
  handlers = providerPatientConnectionHandlers,
  errorMapper = 'provider-patient',
  showApprove = true,
  approveDisabled = false,
}: {
  connectionId: string;
  mode?: ConnectionActionMode;
  handlers?: ConnectionActionHandlers;
  errorMapper?: ConnectionErrorMapper;
  /** Hide for outbound rows awaiting the other party. */
  showApprove?: boolean;
  approveDisabled?: boolean;
}) {
  const resolvedMode: ConnectionActionMode =
    mode ?? (showApprove !== false ? 'inbound-pending' : 'outbound-pending');

  const router = useRouter();
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
      toast.error(`Please enter a reason for ${primaryLabel.toLowerCase()}`);
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
          await handlers.reject(connectionId, trimmed);
          toast.success('Connection rejected');
        } else if (resolvedMode === 'outbound-pending') {
          await handlers.cancel(connectionId, trimmed);
          toast.success('Request cancelled');
        } else {
          await handlers.disconnect(connectionId, trimmed || undefined);
          toast.success('Connection ended');
        }
        setReasonOpen(false);
        setReason('');
        refreshList();
      } catch (err) {
        toast.error(
          formatConnectionError(errorMapper, err, `Failed to ${primaryLabel.toLowerCase()}`),
        );
        if (shouldRefreshAfterConnectionError(err)) {
          refreshList();
        }
      } finally {
        setPendingAction(null);
      }
    });
  }

  const reasonFieldId = `connection-reason-${connectionId}`;

  function refreshList() {
    router.refresh();
  }

  function shouldRefreshAfterConnectionError(err: unknown): boolean {
    const message = formatConnectionError(errorMapper, err, '').toLowerCase();
    return (
      message.includes('already approved') ||
      message.includes('already processed') ||
      message.includes('already connected') ||
      message.includes('no longer pending')
    );
  }

  return (
    <div className="flex min-w-[12rem] flex-col items-end gap-2">
      <div className="flex gap-2">
        {resolvedMode === 'inbound-pending' ? (
          <Button
            size="sm"
            disabled={pending || reasonOpen || approveDisabled}
            loading={pendingAction === 'approve'}
            loadingLabel="Approving…"
            onClick={() =>
              startTransition(async () => {
                setPendingAction('approve');
                try {
                  await handlers.approve(connectionId);
                  toast.success('Connection approved');
                  refreshList();
                } catch (err) {
                  toast.error(formatConnectionError(errorMapper, err, 'Failed to approve'));
                  if (shouldRefreshAfterConnectionError(err)) {
                    refreshList();
                  }
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
          <FormField
            compact
            label={reasonRequired ? 'Reason (required)' : 'Reason (optional)'}
            htmlFor={reasonFieldId}
          >
            <Textarea
              id={reasonFieldId}
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
          </FormField>
          <FormActions>
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
          </FormActions>
        </div>
      ) : null}
    </div>
  );
}
