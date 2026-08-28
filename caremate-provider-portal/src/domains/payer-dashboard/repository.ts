import { getPayerOrganizationProfile } from '@/domains/payer/repository';
import { listPayerProviderConnectionsByStatus } from '@/domains/payer-connections/repository';
import { listPatientPayerConnectionsByStatus } from '@/domains/patient-payer-connections/repository';
import { countPayerDocuments } from '@/domains/payer-documents/repository';
import { countPayerOrgConversations } from '@/domains/payer-messaging/repository';

export type PayerDashboardSnapshot = {
  verificationStatus: string;
  connectedProviders: number;
  inboundProviderRequests: number;
  connectedPatients: number;
  inboundPatientRequests: number;
  documentsShared: number;
  messageThreads: number;
};

export async function getPayerDashboardSnapshot(
  organizationId: string,
): Promise<PayerDashboardSnapshot> {
  const [profileData, connectedProviders, inboundProviders, connectedPatients, inboundPatients, documentsShared, messageThreads] =
    await Promise.all([
      getPayerOrganizationProfile(organizationId),
      listPayerProviderConnectionsByStatus(organizationId, 'approved', { page: 1, pageSize: 1 }),
      listPayerProviderConnectionsByStatus(organizationId, 'pending', {
        page: 1,
        pageSize: 1,
        initiatedBy: 'provider',
      }),
      listPatientPayerConnectionsByStatus(organizationId, 'approved', { page: 1, pageSize: 1 }),
      listPatientPayerConnectionsByStatus(organizationId, 'pending', {
        page: 1,
        pageSize: 1,
        initiatedBy: 'patient',
      }),
      countPayerDocuments(organizationId),
      countPayerOrgConversations(organizationId),
    ]);

  return {
    verificationStatus: profileData?.profile?.verification_status ?? 'pending',
    connectedProviders: connectedProviders.total,
    inboundProviderRequests: inboundProviders.total,
    connectedPatients: connectedPatients.total,
    inboundPatientRequests: inboundPatients.total,
    documentsShared,
    messageThreads,
  };
}
