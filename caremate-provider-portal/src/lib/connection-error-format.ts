import { mapPatientPayerConnectionError } from '@/domains/patient-payer-connections/errors';
import { mapProviderPatientConnectionError } from '@/domains/connections/errors';
import { mapPayerConnectionError } from '@/domains/payer-connections/errors';

/** Serializable key for client-side connection error copy (do not pass functions from RSC). */
export type ConnectionErrorMapper = 'provider-patient' | 'payer-patient' | 'payer-org';

export function formatConnectionError(
  mapper: ConnectionErrorMapper,
  err: unknown,
  fallback: string,
): string {
  switch (mapper) {
    case 'payer-patient':
      return mapPatientPayerConnectionError(err, fallback);
    case 'payer-org':
      return mapPayerConnectionError(err, fallback);
    default:
      return mapProviderPatientConnectionError(err, fallback);
  }
}
