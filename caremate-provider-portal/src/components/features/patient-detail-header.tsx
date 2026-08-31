import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ConnectionActions } from '@/components/features/connection-actions';
import type { ConnectionActionHandlers } from '@/lib/connection-action-handlers';
import type { ConnectionErrorMapper } from '@/lib/connection-error-format';

export function PatientDetailHeader({
  fullName,
  staffBadge,
  extraBadges,
  patientId,
  connectedAt,
  connectionId,
  canWrite,
  connectionHandlers,
  connectionErrorMapper = 'provider-patient',
}: {
  fullName: string;
  staffBadge?: boolean;
  extraBadges?: ReactNode;
  patientId: string | null;
  connectedAt: string | null;
  connectionId: string;
  canWrite: boolean;
  connectionHandlers?: ConnectionActionHandlers;
  connectionErrorMapper?: ConnectionErrorMapper;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">{fullName}</h1>
          {staffBadge ? <Badge variant="default">Staff</Badge> : null}
          {extraBadges}
        </div>
        <p className="mt-1 text-sm text-muted">
          CareMate ID: {patientId ?? '—'} · Connected{' '}
          {connectedAt ? format(new Date(connectedAt), 'MMM d, yyyy') : '—'}
        </p>
      </div>
      {canWrite ? (
        <ConnectionActions
          connectionId={connectionId}
          mode="approved"
          handlers={connectionHandlers}
          errorMapper={connectionErrorMapper}
        />
      ) : null}
    </div>
  );
}
