'use client';

import { ConnectionActions, type ConnectionActionMode } from '@/components/features/connection-actions';
import { payerOrgConnectionHandlers } from '@/lib/connection-action-handlers';

export function OrgConnectionActions({
  connectionId,
  side,
  mode,
}: {
  connectionId: string;
  side: 'provider' | 'payer';
  mode: ConnectionActionMode;
}) {
  return (
    <ConnectionActions
      connectionId={connectionId}
      mode={mode}
      handlers={payerOrgConnectionHandlers(side)}
    />
  );
}
