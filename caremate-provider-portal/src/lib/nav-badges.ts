import { unstable_noStore as noStore } from 'next/cache';
import { listConnectionsByStatus } from '@/domains/connections/repository';
import {
  listPayerProviderConnectionsByStatus,
  listProviderPayerConnectionsByStatus,
} from '@/domains/payer-connections/repository';
import { listPatientPayerConnectionsByStatus } from '@/domains/patient-payer-connections/repository';

/** Nav href → inbound pending count (requests awaiting this org’s action). */
export type CarePortalNavBadges = Record<string, number>;

async function inboundTotal(
  promise: Promise<{ total: number }>,
): Promise<number> {
  try {
    const result = await promise;
    return result.total;
  } catch {
    return 0;
  }
}

export async function getProviderNavBadges(
  organizationId: string,
): Promise<CarePortalNavBadges> {
  noStore();
  const [patientInbound, payerInbound] = await Promise.all([
    inboundTotal(
      listConnectionsByStatus(organizationId, 'pending', {
        page: 1,
        pageSize: 1,
        initiatedBy: 'patient',
      }),
    ),
    inboundTotal(
      listProviderPayerConnectionsByStatus(organizationId, 'pending', {
        page: 1,
        pageSize: 1,
        initiatedBy: 'payer',
      }),
    ),
  ]);

  return {
    '/app/patients/requests': patientInbound,
    '/app/payers/requests': payerInbound,
  };
}

export async function getPayerNavBadges(
  organizationId: string,
): Promise<CarePortalNavBadges> {
  noStore();
  const [providerInbound, patientInbound] = await Promise.all([
    inboundTotal(
      listPayerProviderConnectionsByStatus(organizationId, 'pending', {
        page: 1,
        pageSize: 1,
        initiatedBy: 'provider',
      }),
    ),
    inboundTotal(
      listPatientPayerConnectionsByStatus(organizationId, 'pending', {
        page: 1,
        pageSize: 1,
        initiatedBy: 'patient',
      }),
    ),
  ]);

  return {
    '/payer/providers/requests': providerInbound,
    '/payer/patients/requests': patientInbound,
  };
}
