'use client';

import { ConnectionActions, type ConnectionActionMode } from '@/components/features/connection-actions';
import { payerOrgConnectionHandlers } from '@/lib/connection-action-handlers';

export function OrgConnectionActions({
  connectionId,
  side,
  mode,
  approveDisabled = false,
}: {
  connectionId: string;
  side: 'provider' | 'payer';
  mode: ConnectionActionMode;
  approveDisabled?: boolean;
}) {
  return (
    <ConnectionActions
      connectionId={connectionId}
      mode={mode}
      handlers={payerOrgConnectionHandlers(side)}
      errorMapper="payer-org"
      approveDisabled={approveDisabled}
    />
  );
}
