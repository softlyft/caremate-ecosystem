import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { sendExpoPushNotification } from '../_shared/push.ts';
import { createServiceClient, createUserClient } from '../_shared/supabase.ts';

type NotifyBody = {
  /** Org fan-out (legacy): organizationId + messageIds from org sends. */
  organizationId?: string;
  messageIds?: string[];
  /** Direct DM: notify the other participant for these message ids. */
  mode?: 'org' | 'direct';
  /** When set to payer, authorize via payer_org_members and payer message columns. */
  orgKind?: 'provider' | 'payer';
};

/**
 * Expo push for messaging.
 * - org mode (default): { organizationId, messageIds } — staff fan-out to patients
 * - direct mode: { mode: 'direct', messageIds } — peer-to-peer; caller must be sender
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const userClient = createUserClient(authHeader);
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = (await req.json()) as NotifyBody;
    const messageIds = (body.messageIds ?? []).filter(Boolean);
    if (messageIds.length === 0) {
      return jsonResponse({ error: 'messageIds are required' }, 400);
    }

    if (body.mode === 'direct') {
      return await notifyDirect(authHeader, user.id, messageIds);
    }

    return await notifyOrg(user.id, body.organizationId?.trim(), messageIds, body.orgKind ?? 'provider');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('notify-message', message);
    return jsonResponse({ error: message }, 500);
  }
});

async function notifyOrg(
  userId: string,
  organizationId: string | undefined,
  messageIds: string[],
  orgKind: 'provider' | 'payer' = 'provider',
) {
  if (!organizationId) {
    return jsonResponse({ error: 'organizationId and messageIds are required' }, 400);
  }

  const service = createServiceClient();

  if (orgKind === 'payer') {
    const { data: membership } = await service
      .from('payer_org_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle();

    const role = membership?.role as string | undefined;
    const allowed = role === 'owner' || role === 'administrator' || role === 'staff';
    if (!allowed) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    const { data: org } = await service
      .from('payer_organizations')
      .select('name')
      .eq('id', organizationId)
      .maybeSingle();
    const orgName =
      (typeof org?.name === 'string' && org.name.trim()) || 'your insurer';

    const { data: messages, error: messagesError } = await service
      .from('message_messages')
      .select('id, conversation_id, body, subject, sender_payer_organization_id')
      .in('id', messageIds)
      .eq('sender_payer_organization_id', organizationId);

    if (messagesError) {
      return jsonResponse({ error: messagesError.message }, 500);
    }
    if (!messages?.length) {
      return jsonResponse({ error: 'No matching messages' }, 404);
    }

    const conversationIds = [...new Set(messages.map((m) => m.conversation_id as string))];
    const { data: conversations, error: convError } = await service
      .from('message_conversations')
      .select('id, patient_user_id, payer_organization_id')
      .in('id', conversationIds)
      .eq('payer_organization_id', organizationId);

    if (convError) {
      return jsonResponse({ error: convError.message }, 500);
    }

    const patientByConversation = new Map(
      (conversations ?? []).map((c) => [c.id as string, c.patient_user_id as string]),
    );

    const results: Array<{ messageId: string; status: string }> = [];

    for (const message of messages) {
      const patientId = patientByConversation.get(message.conversation_id as string);
      if (!patientId) {
        results.push({ messageId: message.id as string, status: 'skipped_no_patient' });
        continue;
      }

      const pushTitle = orgName;
      const pushBody = `New message from ${orgName}`;

      try {
        const sent = await sendExpoPushNotification({
          service,
          userId: patientId,
          domain: 'messaging',
          eventType: 'org_message',
          title: pushTitle,
          body: pushBody,
          severity: 'info',
          dedupeKey: `messaging:org_message:${message.id}`,
          entityType: 'message_messages',
          entityId: message.id as string,
          data: {
            conversationId: message.conversation_id,
            messageId: message.id,
            organizationId,
            orgKind: 'payer',
            path: `/messages/${message.conversation_id}`,
          },
        });
        results.push({ messageId: message.id as string, status: sent.deliveryStatus });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'push failed';
        console.error('notify-message push', message.id, msg);
        results.push({ messageId: message.id as string, status: 'failed' });
      }
    }

    return jsonResponse({
      ok: true,
      providerName: orgName,
      results,
    });
  }

  const { data: membership } = await service
    .from('provider_org_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  const role = membership?.role as string | undefined;
  const allowed = role === 'owner' || role === 'administrator' || role === 'staff';
  if (!allowed) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  const { data: org } = await service
    .from('provider_organizations')
    .select('name')
    .eq('id', organizationId)
    .maybeSingle();
  const providerName =
    (typeof org?.name === 'string' && org.name.trim()) || 'your provider';

  const { data: messages, error: messagesError } = await service
    .from('message_messages')
    .select('id, conversation_id, body, subject, sender_organization_id')
    .in('id', messageIds)
    .eq('sender_organization_id', organizationId);

  if (messagesError) {
    return jsonResponse({ error: messagesError.message }, 500);
  }
  if (!messages?.length) {
    return jsonResponse({ error: 'No matching messages' }, 404);
  }

  const conversationIds = [...new Set(messages.map((m) => m.conversation_id as string))];
  const { data: conversations, error: convError } = await service
    .from('message_conversations')
    .select('id, patient_user_id, organization_id')
    .in('id', conversationIds)
    .eq('organization_id', organizationId);

  if (convError) {
    return jsonResponse({ error: convError.message }, 500);
  }

  const patientByConversation = new Map(
    (conversations ?? []).map((c) => [c.id as string, c.patient_user_id as string]),
  );

  const results: Array<{ messageId: string; status: string }> = [];

  for (const message of messages) {
    const patientId = patientByConversation.get(message.conversation_id as string);
    if (!patientId) {
      results.push({ messageId: message.id as string, status: 'skipped_no_patient' });
      continue;
    }

    const pushTitle = providerName;
    const pushBody = `New message from ${providerName}`;

    try {
      const sent = await sendExpoPushNotification({
        service,
        userId: patientId,
        domain: 'messaging',
        eventType: 'org_message',
        title: pushTitle,
        body: pushBody,
        severity: 'info',
        dedupeKey: `messaging:org_message:${message.id}`,
        entityType: 'message_messages',
        entityId: message.id as string,
        data: {
          conversationId: message.conversation_id,
          messageId: message.id,
          organizationId,
          path: `/messages/${message.conversation_id}`,
        },
      });
      results.push({ messageId: message.id as string, status: sent.deliveryStatus });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'push failed';
      console.error('notify-message push', message.id, msg);
      results.push({ messageId: message.id as string, status: 'failed' });
    }
  }

  return jsonResponse({
    ok: true,
    providerName,
    results,
  });
}

async function notifyDirect(_authHeader: string, senderUserId: string, messageIds: string[]) {
  const service = createServiceClient();

  const { data: messages, error: messagesError } = await service
    .from('message_messages')
    .select('id, conversation_id, sender_user_id, sender_party_type, body')
    .in('id', messageIds)
    .eq('sender_party_type', 'user')
    .eq('sender_user_id', senderUserId);

  if (messagesError) {
    return jsonResponse({ error: messagesError.message }, 500);
  }
  if (!messages?.length) {
    return jsonResponse({ error: 'No matching messages' }, 404);
  }

  const { data: senderProfile } = await service
    .from('profiles')
    .select('full_name')
    .eq('user_id', senderUserId)
    .maybeSingle();
  const senderName =
    (typeof senderProfile?.full_name === 'string' && senderProfile.full_name.trim()) ||
    'CareMate member';

  const conversationIds = [...new Set(messages.map((m) => m.conversation_id as string))];
  const { data: conversations } = await service
    .from('message_conversations')
    .select('id, kind')
    .in('id', conversationIds)
    .eq('kind', 'direct');

  const directIds = new Set((conversations ?? []).map((c) => c.id as string));

  const { data: participants } = await service
    .from('message_participants')
    .select('conversation_id, user_id')
    .in('conversation_id', conversationIds)
    .eq('party_type', 'user');

  const peersByConversation = new Map<string, string[]>();
  for (const p of participants ?? []) {
    const cid = p.conversation_id as string;
    const uid = p.user_id as string;
    if (!uid) continue;
    const list = peersByConversation.get(cid) ?? [];
    list.push(uid);
    peersByConversation.set(cid, list);
  }

  const results: Array<{ messageId: string; status: string }> = [];

  for (const message of messages) {
    const cid = message.conversation_id as string;
    if (!directIds.has(cid)) {
      results.push({ messageId: message.id as string, status: 'skipped_not_direct' });
      continue;
    }
    const peers = (peersByConversation.get(cid) ?? []).filter((id) => id !== senderUserId);
    const recipientId = peers[0];
    if (!recipientId) {
      results.push({ messageId: message.id as string, status: 'skipped_no_peer' });
      continue;
    }

    try {
      const sent = await sendExpoPushNotification({
        service,
        userId: recipientId,
        domain: 'messaging',
        eventType: 'direct_message',
        title: senderName,
        body: `New message from ${senderName}`,
        severity: 'info',
        dedupeKey: `messaging:direct_message:${message.id}`,
        entityType: 'message_messages',
        entityId: message.id as string,
        data: {
          conversationId: cid,
          messageId: message.id,
          path: `/messages/${cid}`,
        },
      });
      results.push({ messageId: message.id as string, status: sent.deliveryStatus });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'push failed';
      console.error('notify-message direct push', message.id, msg);
      results.push({ messageId: message.id as string, status: 'failed' });
    }
  }

  return jsonResponse({ ok: true, results });
}
