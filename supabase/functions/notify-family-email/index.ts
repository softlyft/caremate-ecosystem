import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { sendTransactionalEmail } from '../_shared/email.ts';
import { sendExpoPushNotification } from '../_shared/push.ts';
import { createServiceClient, createUserClient } from '../_shared/supabase.ts';

type NotifyKind = 'request' | 'accepted' | 'declined';

/**
 * Authenticated family connection notifier (email + push).
 * Body: { requestId: string, kind?: 'request' | 'accepted' | 'declined' }
 *
 * - request (default): sender invokes → email + push to receiver
 * - accepted / declined: receiver invokes → push to sender
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

    const body = (await req.json()) as { requestId?: string; kind?: string };
    const requestId = body.requestId?.trim();
    if (!requestId) {
      return jsonResponse({ error: 'requestId is required' }, 400);
    }

    const kind: NotifyKind =
      body.kind === 'accepted' || body.kind === 'declined' ? body.kind : 'request';

    const service = createServiceClient();
    const { data: request, error: requestError } = await service
      .from('family_connection_requests')
      .select('id, from_user_id, to_user_id, to_email, status')
      .eq('id', requestId)
      .maybeSingle();

    if (requestError) {
      return jsonResponse({ error: requestError.message }, 500);
    }
    if (!request) {
      return jsonResponse({ error: 'Request not found' }, 404);
    }

    if (kind === 'request') {
      return await handleRequestKind({ service, user, request });
    }

    return await handleRespondKind({ service, user, request, kind });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('notify-family-email', message);
    return jsonResponse({ error: message }, 500);
  }
});

async function handleRequestKind(params: {
  service: ReturnType<typeof createServiceClient>;
  user: { id: string; email?: string };
  request: {
    id: string;
    from_user_id: string;
    to_user_id: string | null;
    to_email: string | null;
    status: string;
  };
}) {
  const { service, user, request } = params;

  if (request.from_user_id !== user.id) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }
  if (request.status !== 'pending') {
    return jsonResponse({ ok: true, skipped: true, reason: 'not_pending' });
  }
  if (!request.to_user_id) {
    return jsonResponse({ ok: true, skipped: true, reason: 'no_matched_user' });
  }

  const { data: fromProfile } = await service
    .from('profiles')
    .select('full_name, email')
    .eq('user_id', user.id)
    .maybeSingle();

  const fromName =
    (typeof fromProfile?.full_name === 'string' && fromProfile.full_name.trim()) ||
    user.email?.split('@')[0] ||
    'Someone';

  const title = 'Family connection request';
  const bodyText = `${fromName} wants to connect with you in CareMate Family. Open Family to respond.`;
  const pushDedupeKey = `family:request:${request.id}:pending`;

  const pushResult = await sendExpoPushNotification({
    service,
    userId: request.to_user_id,
    domain: 'family',
    eventType: 'connection_request_received',
    title,
    body: bodyText,
    severity: 'important',
    dedupeKey: pushDedupeKey,
    entityType: 'family_connection_requests',
    entityId: request.id,
  });

  let toEmail =
    typeof request.to_email === 'string' && request.to_email.includes('@')
      ? request.to_email.trim().toLowerCase()
      : null;

  if (!toEmail) {
    const { data: toProfile } = await service
      .from('profiles')
      .select('email')
      .eq('user_id', request.to_user_id)
      .maybeSingle();
    if (typeof toProfile?.email === 'string' && toProfile.email.includes('@')) {
      toEmail = toProfile.email.trim().toLowerCase();
    } else {
      const { data: authUser } = await service.auth.admin.getUserById(request.to_user_id);
      toEmail = authUser?.user?.email?.trim().toLowerCase() ?? null;
    }
  }

  let emailResult: {
    deliveryStatus: string;
    notificationId: string;
    error?: string;
  } | null = null;

  if (toEmail) {
    emailResult = await sendTransactionalEmail({
      service,
      to: toEmail,
      userId: request.to_user_id,
      domain: 'family',
      eventType: 'connection_request_received',
      title,
      body: bodyText,
      severity: 'important',
      dedupeKey: `family:request:${request.id}:email`,
      template: 'family-connection-request',
      templateVars: { fromName },
      entityType: 'family_connection_requests',
      entityId: request.id,
    });
  }

  return jsonResponse({
    ok: true,
    kind: 'request',
    push_delivery_status: pushResult.deliveryStatus,
    push_notification_id: pushResult.notificationId || null,
    push_error: pushResult.error ?? null,
    email_delivery_status: emailResult?.deliveryStatus ?? 'skipped',
    email_notification_id: emailResult?.notificationId || null,
    email_error: emailResult?.error ?? (toEmail ? null : 'no_recipient_email'),
  });
}

async function handleRespondKind(params: {
  service: ReturnType<typeof createServiceClient>;
  user: { id: string; email?: string };
  request: {
    id: string;
    from_user_id: string;
    to_user_id: string | null;
    to_email: string | null;
    status: string;
  };
  kind: 'accepted' | 'declined';
}) {
  const { service, user, request, kind } = params;

  if (request.to_user_id !== user.id) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  const expectedStatus = kind === 'accepted' ? 'accepted' : 'declined';
  if (request.status !== expectedStatus) {
    return jsonResponse({ ok: true, skipped: true, reason: 'status_mismatch' });
  }

  const { data: responderProfile } = await service
    .from('profiles')
    .select('full_name, email')
    .eq('user_id', user.id)
    .maybeSingle();

  const responderName =
    (typeof responderProfile?.full_name === 'string' && responderProfile.full_name.trim()) ||
    user.email?.split('@')[0] ||
    'Someone';

  const title =
    kind === 'accepted' ? 'Family connection accepted' : 'Family connection declined';
  const bodyText =
    kind === 'accepted'
      ? `${responderName} accepted your CareMate Family connection request.`
      : `${responderName} declined your CareMate Family connection request.`;
  const eventType =
    kind === 'accepted' ? 'connection_request_accepted' : 'connection_request_declined';
  const dedupeKey = `family:request:${request.id}:${kind}`;

  const pushResult = await sendExpoPushNotification({
    service,
    userId: request.from_user_id,
    domain: 'family',
    eventType,
    title,
    body: bodyText,
    severity: 'important',
    dedupeKey,
    entityType: 'family_connection_requests',
    entityId: request.id,
  });

  return jsonResponse({
    ok: true,
    kind,
    push_delivery_status: pushResult.deliveryStatus,
    push_notification_id: pushResult.notificationId || null,
    push_error: pushResult.error ?? null,
  });
}
