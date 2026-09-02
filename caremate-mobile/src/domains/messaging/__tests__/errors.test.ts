import {
  careCoordinationErrorKey,
  directMessageErrorKey,
  formatCareCoordinationAlert,
  formatCareCoordinationLoadAlert,
  formatCareTeamMessageAlert,
  formatDirectMessageStartAlert,
  formatOrgInboxMessageAlert,
  normalizeRpcError,
  orgInboxMessageErrorKey,
  requireRpcConversationId,
  throwIfRpcError,
} from '@/domains/messaging/errors';

describe('messaging errors', () => {
  const t = (key: string) => key;
  const networkFallback = 'messages.sendFailedMessage';

  describe('normalizeRpcError', () => {
    it('extracts message from PostgREST-shaped RPC errors', () => {
      expect(
        normalizeRpcError(
          { message: 'Messaging consent required', code: 'P0001', details: null, hint: null },
          'fallback',
        ).message,
      ).toBe('Messaging consent required');
    });

    it('uses fallback when error object has no message', () => {
      expect(normalizeRpcError({}, 'Could not start chat').message).toBe('Could not start chat');
    });

    it('prefers Error.message over fallback', () => {
      expect(
        normalizeRpcError(new Error('Not connected to this provider'), 'fallback').message,
      ).toBe('Not connected to this provider');
    });
  });

  describe('throwIfRpcError', () => {
    it('does not throw when error is null or undefined', () => {
      expect(() => throwIfRpcError(null, 'fallback')).not.toThrow();
      expect(() => throwIfRpcError(undefined, 'fallback')).not.toThrow();
    });

    it('throws normalized Error for RPC failures', () => {
      expect(() => throwIfRpcError({ message: 'Forbidden' }, 'fallback')).toThrow('Forbidden');
    });
  });

  describe('requireRpcConversationId', () => {
    it('returns conversation id from RPC payload', () => {
      expect(requireRpcConversationId({ conversation_id: 'abc-123' }, 'start')).toBe('abc-123');
    });

    it('throws when conversation id is missing or empty', () => {
      expect(() => requireRpcConversationId({}, 'open_patient_org_conversation')).toThrow(
        'open_patient_org_conversation: server did not return a conversation id',
      );
      expect(() => requireRpcConversationId({ conversation_id: '' }, 'start')).toThrow(
        'start: server did not return a conversation id',
      );
    });
  });

  describe('careCoordinationErrorKey', () => {
    const cases: [string, string][] = [
      ['Conversation not found', 'messages.coordinationConversationNotFound'],
      ['Invalid source conversation', 'messages.coordinationConversationNotFound'],
      ['Not connected to this provider', 'messages.coordinationProviderNotConnected'],
      ['Not connected to this payer', 'messages.coordinationPayerNotConnected'],
      ['Not connected to this insurer', 'messages.coordinationPayerNotConnected'],
      ['Provider and payer organizations are not linked', 'messages.coordinationOrgsNotLinked'],
      ['Messaging consent required', 'messages.coordinationConsentRequired'],
      ['Organization is not eligible for care coordination', 'messages.coordinationNotEligible'],
      [
        'function start_care_coordination_from_source() does not exist',
        'messages.coordinationNotAvailable',
      ],
      [
        'new row for relation "message_conversations" violates check constraint "message_conversations_kind_check"',
        'messages.coordinationNotAvailable',
      ],
      ['No approved recipients with messaging consent', 'messages.coordinationConsentRequired'],
      ['Unexpected server failure', 'messages.coordinationStartFailed'],
    ];

    it.each(cases)('maps %j to %s', (message, key) => {
      expect(careCoordinationErrorKey({ message })).toBe(key);
    });
  });

  describe('directMessageErrorKey', () => {
    it.each([
      ['Not connected to this payer', 'messages.payerNotConnected'],
      ['Messaging consent required', 'messages.messagingConsentRequired'],
      ['You cannot message this person', 'messages.searchNoResultsMessage'],
      ['Something else', 'messages.startFailedMessage'],
    ])('maps %j to %s', (message, key) => {
      expect(directMessageErrorKey({ message })).toBe(key);
    });
  });

  describe('orgInboxMessageErrorKey', () => {
    it.each([
      ['Messaging consent required', 'messages.messagingConsentRequired'],
      ['Not connected to this insurer', 'messages.payerNotConnected'],
      ['Not connected to this provider', 'messages.coordinationProviderNotConnected'],
      ['Unknown', 'messages.startFailedMessage'],
    ])('maps %j to %s', (message, key) => {
      expect(orgInboxMessageErrorKey({ message })).toBe(key);
    });
  });

  describe('formatCareCoordinationAlert', () => {
    it('returns translated key for known coordination errors', () => {
      expect(
        formatCareCoordinationAlert(
          { message: 'Provider and payer organizations are not linked' },
          t,
        ),
      ).toBe('messages.coordinationOrgsNotLinked');
    });

    it('returns raw server message for unknown coordination errors', () => {
      expect(
        formatCareCoordinationAlert(
          { message: 'Could not open care coordination conversation' },
          t,
        ),
      ).toBe('Could not open care coordination conversation');
    });

    it('does not stringify PostgREST objects as [object Object]', () => {
      const alert = formatCareCoordinationAlert(
        { message: 'Custom database rejection', code: '23514' },
        t,
      );
      expect(alert).toBe('Custom database rejection');
      expect(alert).not.toContain('[object Object]');
    });
  });

  describe('formatDirectMessageStartAlert', () => {
    it('maps consent errors to friendly copy', () => {
      expect(formatDirectMessageStartAlert({ message: 'Messaging consent required' }, t)).toBe(
        'messages.messagingConsentRequired',
      );
    });
  });

  describe('formatOrgInboxMessageAlert', () => {
    it('maps insurer connection errors to friendly copy', () => {
      expect(formatOrgInboxMessageAlert({ message: 'Not connected to this insurer' }, t)).toBe(
        'messages.payerNotConnected',
      );
    });
  });

  describe('formatCareTeamMessageAlert', () => {
    it('uses org inbox formatter when message opens org inbox', () => {
      expect(
        formatCareTeamMessageAlert({ message: 'Not connected to this insurer' }, true, t),
      ).toBe('messages.payerNotConnected');
    });

    it('uses direct formatter for staff DMs', () => {
      expect(formatCareTeamMessageAlert({ message: 'Messaging consent required' }, false, t)).toBe(
        'messages.messagingConsentRequired',
      );
    });
  });

  describe('formatCareCoordinationLoadAlert', () => {
    it('falls back to load failed copy when error is empty', () => {
      expect(formatCareCoordinationLoadAlert({}, t)).toBe('messages.coordinationLoadFailed');
    });

    it('surfaces server message for load failures', () => {
      expect(formatCareCoordinationLoadAlert({ message: 'Conversation not found' }, t)).toBe(
        'Conversation not found',
      );
    });

    it('uses network fallback for connectivity errors', () => {
      expect(formatCareCoordinationLoadAlert(new Error('Network request failed'), t)).toBe(
        networkFallback,
      );
    });
  });
});
