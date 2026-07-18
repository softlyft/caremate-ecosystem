import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { sendTransactionalEmail } from '../_shared/email.ts';
import { createServiceClient, createUserClient } from '../_shared/supabase.ts';

/**
 * Authenticated: after creating a family connection request, email the receiver.
 * Body: { requestId: string }
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

    const body = (await req.json()) as { requestId?: string };
    const requestId = body.requestId?.trim();
    if (!requestId) {
      return jsonResponse({ error: 'requestId is required' }, 400);
    }

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

    if (!toEmail) {
      return jsonResponse({ ok: true, skipped: true, reason: 'no_recipient_email' });
    }

    const result = await sendTransactionalEmail({
      service,
      to: toEmail,
      userId: request.to_user_id,
      domain: 'family',
      eventType: 'connection_request_received',
      title: 'Family connection request',
      body: `${fromName} wants to connect with you in CareMate Family. Open Family to respond.`,
      severity: 'important',
      dedupeKey: `family:request:${request.id}:email`,
      template: 'family-connection-request',
      templateVars: { fromName },
      entityType: 'family_connection_requests',
      entityId: request.id,
    });

    return jsonResponse({
      ok: true,
      delivery_status: result.deliveryStatus,
      notification_id: result.notificationId || null,
      error: result.error ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('notify-family-email', message);
    return jsonResponse({ error: message }, 500);
  }
});
