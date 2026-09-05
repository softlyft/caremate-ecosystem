import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { OrgThreadMessage } from '@/domains/messaging/client-messages';
import {
  enrichOrgThreadMessages,
  isGroupThread,
  portalThreadHeaderTitle,
  resolvePortalSenderDisplay,
  type ThreadDisplayContext,
} from '@/domains/messaging/sender-display';

const coordinationContext: ThreadDisplayContext = {
  conversationKind: 'care_coordination',
  patientUserId: 'patient-1',
  patientName: 'Jane Doe',
  providerOrgName: 'City Clinic',
  payerOrgName: 'Leadway Insurance',
  profileNamesByUserId: {
    'staff-1': 'Dr. Ada',
  },
};

const orgPatientContext: ThreadDisplayContext = {
  ...coordinationContext,
  conversationKind: 'org_patient',
};

function message(overrides: Partial<OrgThreadMessage> = {}): OrgThreadMessage {
  return {
    id: 'm1',
    sender_party_type: 'organization',
    sender_user_id: null,
    sender_organization_id: 'prov-1',
    sender_payer_organization_id: null,
    body: 'Hello',
    subject: null,
    created_at: '2026-01-01T12:00:00Z',
    ...overrides,
  };
}

describe('portal sender-display', () => {
  describe('portalThreadHeaderTitle', () => {
    it('shows patient name for one-to-one org threads', () => {
      assert.equal(
        portalThreadHeaderTitle({
          conversationKind: 'org_patient',
          patientName: 'Jane Doe',
          providerOrgName: 'City Clinic',
          payerOrgName: 'Leadway Insurance',
        }),
        'Jane Doe',
      );
    });

    it('falls back to Patient when name is missing', () => {
      assert.equal(
        portalThreadHeaderTitle({
          conversationKind: 'org_patient',
          patientName: null,
          providerOrgName: 'City Clinic',
          payerOrgName: 'Leadway Insurance',
        }),
        'Patient',
      );
    });

    it('shows Deleted user for tombstone names', () => {
      assert.equal(
        portalThreadHeaderTitle({
          conversationKind: 'org_patient',
          patientName: 'Deleted user',
          providerOrgName: 'City Clinic',
          payerOrgName: 'Leadway Insurance',
        }),
        'Deleted user',
      );
    });

    it('joins provider and payer org names for care team threads', () => {
      assert.equal(
        portalThreadHeaderTitle({
          conversationKind: 'care_coordination',
          patientName: 'Jane Doe',
          providerOrgName: 'City Clinic',
          payerOrgName: 'Leadway Insurance',
        }),
        'City Clinic + Leadway Insurance',
      );
    });
  });

  describe('isGroupThread', () => {
    it('detects care coordination threads', () => {
      assert.equal(isGroupThread(coordinationContext), true);
      assert.equal(isGroupThread(orgPatientContext), false);
    });
  });

  describe('resolvePortalSenderDisplay', () => {
    it('returns null for one-to-one org threads', () => {
      assert.equal(resolvePortalSenderDisplay(message(), orgPatientContext), null);
    });

    it('labels provider org messages with org name and provider role', () => {
      assert.deepEqual(resolvePortalSenderDisplay(message(), coordinationContext), {
        name: 'City Clinic',
        roleLabel: 'provider',
      });
    });

    it('labels payer org messages with org name and insurer role', () => {
      assert.deepEqual(
        resolvePortalSenderDisplay(
          message({
            sender_organization_id: null,
            sender_payer_organization_id: 'pay-1',
          }),
          coordinationContext,
        ),
        {
          name: 'Leadway Insurance',
          roleLabel: 'insurer',
        },
      );
    });

    it('labels the patient participant by name', () => {
      assert.deepEqual(
        resolvePortalSenderDisplay(
          message({
            sender_party_type: 'user',
            sender_user_id: 'patient-1',
            sender_organization_id: null,
          }),
          coordinationContext,
        ),
        {
          name: 'Jane Doe',
          roleLabel: 'participant',
        },
      );
    });

    it('falls back to Patient when patient name is missing', () => {
      assert.deepEqual(
        resolvePortalSenderDisplay(
          message({
            sender_party_type: 'user',
            sender_user_id: 'patient-1',
            sender_organization_id: null,
          }),
          { ...coordinationContext, patientName: null },
        ),
        {
          name: 'Patient',
          roleLabel: 'participant',
        },
      );
    });

    it('labels anonymized senders without user id as Deleted user', () => {
      assert.deepEqual(
        resolvePortalSenderDisplay(
          message({
            sender_party_type: 'user',
            sender_user_id: null,
            sender_organization_id: null,
          }),
          coordinationContext,
        ),
        {
          name: 'Deleted user',
          roleLabel: 'participant',
        },
      );
    });

    it('labels staff users with profile name and care team role', () => {
      assert.deepEqual(
        resolvePortalSenderDisplay(
          message({
            sender_party_type: 'user',
            sender_user_id: 'staff-1',
            sender_organization_id: null,
          }),
          coordinationContext,
        ),
        {
          name: 'Dr. Ada',
          roleLabel: 'care team',
        },
      );
    });

    it('falls back to Care team member for unknown staff users', () => {
      assert.deepEqual(
        resolvePortalSenderDisplay(
          message({
            sender_party_type: 'user',
            sender_user_id: 'staff-2',
            sender_organization_id: null,
          }),
          coordinationContext,
        ),
        {
          name: 'Care team member',
          roleLabel: 'care team',
        },
      );
    });

    it('returns null for organization messages without org ids', () => {
      assert.equal(
        resolvePortalSenderDisplay(
          message({
            sender_organization_id: null,
            sender_payer_organization_id: null,
          }),
          coordinationContext,
        ),
        null,
      );
    });
  });

  describe('enrichOrgThreadMessages', () => {
    it('enriches every message in a group thread', () => {
      const messages: OrgThreadMessage[] = [
        message({
          id: 'm1',
          sender_party_type: 'user',
          sender_user_id: 'patient-1',
          sender_organization_id: null,
        }),
        message({
          id: 'm2',
          sender_organization_id: null,
          sender_payer_organization_id: 'pay-1',
        }),
      ];

      const enriched = enrichOrgThreadMessages(messages, coordinationContext);
      assert.deepEqual(enriched[0]?.senderDisplay, {
        name: 'Jane Doe',
        roleLabel: 'participant',
      });
      assert.deepEqual(enriched[1]?.senderDisplay, {
        name: 'Leadway Insurance',
        roleLabel: 'insurer',
      });
    });

    it('clears sender display for one-to-one org threads', () => {
      const enriched = enrichOrgThreadMessages([message()], orgPatientContext);
      assert.equal(enriched[0]?.senderDisplay, null);
    });
  });
});
