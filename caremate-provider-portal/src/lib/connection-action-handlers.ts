import {
  approveConnectionAction,
  cancelPendingConnectionAction,
  disconnectConnectionAction,
  rejectConnectionAction,
} from '@/domains/connections/actions';
import {
  approvePatientConnectionAsPayerAction,
  cancelPatientConnectionAsPayerAction,
  disconnectPatientConnectionAsPayerAction,
  rejectPatientConnectionAsPayerAction,
} from '@/domains/patient-payer-connections/actions';
import { mapPatientPayerConnectionError } from '@/domains/patient-payer-connections/errors';
import {
  approvePayerConnectionAsProviderAction,
  approveProviderConnectionAsPayerAction,
  cancelPayerConnectionAsProviderAction,
  cancelProviderConnectionAsPayerAction,
  disconnectPayerConnectionAsProviderAction,
  disconnectProviderConnectionAsPayerAction,
  rejectPayerConnectionAsProviderAction,
  rejectProviderConnectionAsPayerAction,
} from '@/domains/payer-connections/actions';
import { mapPayerConnectionError } from '@/domains/payer-connections/errors';

export type ConnectionActionHandlers = {
  approve: (connectionId: string) => Promise<void>;
  reject: (connectionId: string, reason: string) => Promise<void>;
  cancel: (connectionId: string, reason: string) => Promise<void>;
  disconnect: (connectionId: string, reason?: string) => Promise<void>;
  formatError: (err: unknown, fallback: string) => string;
};

export const providerPatientConnectionHandlers: ConnectionActionHandlers = {
  approve: approveConnectionAction,
  reject: rejectConnectionAction,
  cancel: cancelPendingConnectionAction,
  disconnect: disconnectConnectionAction,
  formatError: (err, fallback) => (err instanceof Error ? err.message : fallback),
};

export const payerPatientConnectionHandlers: ConnectionActionHandlers = {
  approve: approvePatientConnectionAsPayerAction,
  reject: rejectPatientConnectionAsPayerAction,
  cancel: cancelPatientConnectionAsPayerAction,
  disconnect: disconnectPatientConnectionAsPayerAction,
  formatError: mapPatientPayerConnectionError,
};

export function payerOrgConnectionHandlers(side: 'provider' | 'payer'): ConnectionActionHandlers {
  if (side === 'provider') {
    return {
      approve: approvePayerConnectionAsProviderAction,
      reject: rejectPayerConnectionAsProviderAction,
      cancel: cancelPayerConnectionAsProviderAction,
      disconnect: disconnectPayerConnectionAsProviderAction,
      formatError: mapPayerConnectionError,
    };
  }
  return {
    approve: approveProviderConnectionAsPayerAction,
    reject: rejectProviderConnectionAsPayerAction,
    cancel: cancelProviderConnectionAsPayerAction,
    disconnect: disconnectProviderConnectionAsPayerAction,
    formatError: mapPayerConnectionError,
  };
}
