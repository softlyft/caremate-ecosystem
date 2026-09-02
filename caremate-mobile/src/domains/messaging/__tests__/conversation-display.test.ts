import { buildConversationTitle } from '@/domains/messaging/conversation-display';

describe('conversation-display', () => {
  it('builds direct message titles from peer name', () => {
    expect(
      buildConversationTitle({
        kind: 'direct',
        peer_name: 'Dr. Ada',
      }),
    ).toBe('Dr. Ada');
  });

  it('falls back for unnamed direct threads', () => {
    expect(
      buildConversationTitle({
        kind: 'direct',
        peer_name: null,
      }),
    ).toBe('Direct message');
  });

  it('joins provider and payer names for care coordination threads', () => {
    expect(
      buildConversationTitle({
        kind: 'care_coordination',
        coordination_provider_name: 'City Clinic',
        coordination_payer_name: 'Leadway Insurance',
      }),
    ).toBe('City Clinic + Leadway Insurance');
  });

  it('uses single org name when only one side is present in coordination', () => {
    expect(
      buildConversationTitle({
        kind: 'care_coordination',
        coordination_provider_name: 'City Clinic',
        coordination_payer_name: null,
      }),
    ).toBe('City Clinic');
  });

  it('uses insurer fallback for payer org inbox threads', () => {
    expect(
      buildConversationTitle({
        kind: 'org_patient',
        org_side: 'payer',
        payer_organization_id: 'pay-1',
        organization_name: null,
      }),
    ).toBe('Insurer');
  });

  it('uses provider org name for clinic inbox threads', () => {
    expect(
      buildConversationTitle({
        kind: 'org_patient',
        org_side: 'provider',
        organization_name: 'City Clinic',
      }),
    ).toBe('City Clinic');
  });
});
