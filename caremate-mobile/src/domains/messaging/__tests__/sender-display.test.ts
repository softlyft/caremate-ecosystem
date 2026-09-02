import {
  conversationHeaderTitle,
  enrichMessageSenders,
  isGroupConversation,
  resolveMessageSenderDisplay,
} from '@/domains/messaging/sender-display';
import {
  coordinationConversation,
  directConversation,
  headerLabels,
  orgMessage,
  orgPatientConversation,
  senderLabels,
} from '@/domains/messaging/test-fixtures';

const mockProfileIn = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        in: mockProfileIn,
      })),
    })),
  },
}));

describe('sender-display', () => {
  beforeEach(() => {
    mockProfileIn.mockReset();
    mockProfileIn.mockResolvedValue({ data: [] });
  });

  describe('isGroupConversation', () => {
    it('returns true only for care coordination threads', () => {
      expect(isGroupConversation(coordinationConversation)).toBe(true);
      expect(isGroupConversation(orgPatientConversation)).toBe(false);
      expect(isGroupConversation(directConversation)).toBe(false);
      expect(isGroupConversation(null)).toBe(false);
    });
  });

  describe('conversationHeaderTitle', () => {
    it('uses peer name for direct threads', () => {
      expect(conversationHeaderTitle(directConversation, headerLabels)).toBe('Dr. Ada');
    });

    it('falls back for direct threads without peer name', () => {
      expect(
        conversationHeaderTitle({ ...directConversation, peer_name: null }, headerLabels),
      ).toBe('Direct');
    });

    it('uses coordination title for care team threads', () => {
      expect(conversationHeaderTitle(coordinationConversation, headerLabels)).toBe(
        'City Clinic + Leadway Insurance',
      );
    });

    it('uses organization name for provider org inbox threads', () => {
      expect(conversationHeaderTitle(orgPatientConversation, headerLabels)).toBe('City Clinic');
    });

    it('uses insurer fallback for payer-side org threads without name', () => {
      expect(
        conversationHeaderTitle(
          {
            ...orgPatientConversation,
            org_side: 'payer',
            payer_organization_id: 'pay-1',
            organization_name: null,
          },
          headerLabels,
        ),
      ).toBe('Insurer');
    });

    it('returns thread fallback when conversation is missing', () => {
      expect(conversationHeaderTitle(null, headerLabels)).toBe('Conversation');
    });
  });

  describe('resolveMessageSenderDisplay', () => {
    const baseContext = {
      conversation: coordinationConversation,
      userId: 'patient-1',
      labels: senderLabels,
      profileNameById: new Map<string, string | null>([['staff-1', 'Dr. Ada']]),
      providerName: 'City Clinic',
      payerName: 'Leadway Insurance',
    };

    it('returns null for one-to-one org threads', () => {
      expect(
        resolveMessageSenderDisplay(orgMessage(), {
          ...baseContext,
          conversation: orgPatientConversation,
        }),
      ).toBeNull();
    });

    it('labels provider org messages with org name and provider role', () => {
      expect(resolveMessageSenderDisplay(orgMessage(), baseContext)).toEqual({
        name: 'City Clinic',
        roleLabel: 'provider',
      });
    });

    it('labels payer org messages with org name and insurer role', () => {
      expect(
        resolveMessageSenderDisplay(
          orgMessage({
            sender_organization_id: null,
            sender_payer_organization_id: 'pay-1',
          }),
          baseContext,
        ),
      ).toEqual({
        name: 'Leadway Insurance',
        roleLabel: 'insurer',
      });
    });

    it('labels the current patient as You with participant role', () => {
      expect(
        resolveMessageSenderDisplay(
          orgMessage({
            sender_party_type: 'user',
            sender_user_id: 'patient-1',
            sender_organization_id: null,
          }),
          baseContext,
        ),
      ).toEqual({
        name: 'You',
        roleLabel: 'participant',
      });
    });

    it('labels other patients as participant', () => {
      expect(
        resolveMessageSenderDisplay(
          orgMessage({
            sender_party_type: 'user',
            sender_user_id: 'patient-2',
            sender_organization_id: null,
          }),
          {
            ...baseContext,
            conversation: { ...coordinationConversation, patient_user_id: 'patient-2' },
            userId: 'patient-1',
          },
        ),
      ).toEqual({
        name: 'CareMate member',
        roleLabel: 'participant',
      });
    });

    it('labels staff users with profile name and care team role', () => {
      expect(
        resolveMessageSenderDisplay(
          orgMessage({
            sender_party_type: 'user',
            sender_user_id: 'staff-1',
            sender_organization_id: null,
          }),
          baseContext,
        ),
      ).toEqual({
        name: 'Dr. Ada',
        roleLabel: 'care team',
      });
    });

    it('returns null for organization messages without org ids', () => {
      expect(
        resolveMessageSenderDisplay(
          orgMessage({
            sender_organization_id: null,
            sender_payer_organization_id: null,
          }),
          baseContext,
        ),
      ).toBeNull();
    });
  });

  describe('enrichMessageSenders', () => {
    it('returns null sender display for non-group conversations without querying profiles', async () => {
      const result = await enrichMessageSenders(
        [
          orgMessage({
            sender_party_type: 'user',
            sender_user_id: 'staff-1',
            sender_organization_id: null,
          }),
        ],
        orgPatientConversation,
        'patient-1',
        senderLabels,
      );

      expect(result).toEqual([expect.objectContaining({ senderDisplay: null })]);
      expect(mockProfileIn).not.toHaveBeenCalled();
    });

    it('loads profile names and enriches group thread messages', async () => {
      mockProfileIn.mockResolvedValue({
        data: [{ user_id: 'staff-1', full_name: 'Dr. Ada' }],
      });

      const enriched = await enrichMessageSenders(
        [
          orgMessage({
            sender_party_type: 'user',
            sender_user_id: 'staff-1',
            sender_organization_id: null,
          }),
          orgMessage({
            id: 'msg-2',
            sender_organization_id: null,
            sender_payer_organization_id: 'pay-1',
          }),
        ],
        coordinationConversation,
        'patient-1',
        senderLabels,
      );

      expect(mockProfileIn).toHaveBeenCalledWith('user_id', ['staff-1']);
      expect(enriched[0]?.senderDisplay).toEqual({ name: 'Dr. Ada', roleLabel: 'care team' });
      expect(enriched[1]?.senderDisplay).toEqual({
        name: 'Leadway Insurance',
        roleLabel: 'insurer',
      });
    });

    it('uses coordination fallbacks when org names are missing', async () => {
      const enriched = await enrichMessageSenders(
        [orgMessage()],
        {
          ...coordinationConversation,
          coordination_provider_name: null,
          coordination_payer_name: null,
        },
        'patient-1',
        senderLabels,
      );

      expect(enriched[0]?.senderDisplay).toEqual({
        name: 'Provider',
        roleLabel: 'provider',
      });
    });
  });
});
