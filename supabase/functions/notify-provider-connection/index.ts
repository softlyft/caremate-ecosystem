import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { sendExpoPushNotification } from '../_shared/push.ts';
import { createServiceClient, createUserClient } from '../_shared/supabase.ts';

type NotifyKind = 'request' | 'accepted' | 'declined' | 'cancelled' | 'disconnected';

type ConnectionRow = {
  id: string;
  patient_id: string;
  organization_id: string;
  status: string;
  initiated_by: 'patient' | 'provider';
};

/**
 * Authenticated patient ↔ provider connection notifier (push only).
 * Body: { connectionId: string, kind: 'request' | 'accepted' | 'declined' | 'cancelled' | 'disconnected' }
 *
 * - request: provider-initiated → Expo push to patient; patient-initiated → portal activity only
 * - accepted / declined / cancelled / disconnected: push to patient when they are the recipient
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

    const body = (await req.json()) as { connectionId?: string; kind?: string };
    const connectionId = body.connectionId?.trim();
    if (!connectionId) {
      return jsonResponse({ error: 'connectionId is required' }, 400);
    }

    const kind = parseKind(body.kind);
    if (!kind) {
      return jsonResponse({ error: 'Invalid kind' }, 400);
    }

    const service = createServiceClient();
    const { data: connection, error: connectionError } = await service
      .from('patient_provider_connections')
      .select('id, patient_id, organization_id, status, initiated_by')
      .eq('id', connectionId)
      .maybeSingle();

    if (connectionError) {
      return jsonResponse({ error: connectionError.message }, 500);
    }
    if (!connection) {
      return jsonResponse({ error: 'Connection not found' }, 404);
    }

    const row = connection as ConnectionRow;
    const caller = await getCallerAuth(service, user.id, row);

    if (!caller.isPatient && !caller.canProvider) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    const authzError = validateCallerForKind(kind, row, caller);
    if (authzError) {
      return jsonResponse({ error: authzError }, 403);
    }

    const expectedStatus = expectedStatusForKind(kind);
    if (row.status !== expectedStatus) {
      return jsonResponse({ ok: true, skipped: true, reason: 'status_mismatch' });
    }

    const recipientUserId = getPatientPushRecipient(row, kind, caller);
    if (!recipientUserId) {
      return jsonResponse({ ok: true, skipped: true, reason: 'no_patient_recipient' });
    }

    const { data: org } = await service
      .from('provider_organizations')
      .select('name')
      .eq('id', row.organization_id)
      .maybeSingle();
    const orgName =
      (typeof org?.name === 'string' && org.name.trim()) || 'A provider';

    const { title, bodyText, eventType } = buildPushCopy(kind, orgName);
    const dedupeKey = `providers:connection:${row.id}:${kind}`;

    const pushResult = await sendExpoPushNotification({
      service,
      userId: recipientUserId,
      domain: 'providers',
      eventType,
      title,
      body: bodyText,
      severity: 'important',
      dedupeKey,
      entityType: 'patient_provider_connections',
      entityId: row.id,
      data: {
        connectionId: row.id,
        organizationId: row.organization_id,
        path: '/providers/connections/requests',
      },
    });

    return jsonResponse({
      ok: true,
      kind,
      push_delivery_status: pushResult.deliveryStatus,
      push_notification_id: pushResult.notificationId || null,
      push_error: pushResult.error ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('notify-provider-connection', message);
    return jsonResponse({ error: message }, 500);
  }
});

function parseKind(raw: string | undefined): NotifyKind | null {
  if (
    raw === 'request' ||
    raw === 'accepted' ||
    raw === 'declined' ||
    raw === 'cancelled' ||
    raw === 'disconnected'
  ) {
    return raw;
  }
  return null;
}

async function getCallerAuth(
  service: ReturnType<typeof createServiceClient>,
  userId: string,
  connection: Pick<ConnectionRow, 'patient_id' | 'organization_id'>,
): Promise<{ isPatient: boolean; canProvider: boolean }> {
  const isPatient = userId === connection.patient_id;
  if (isPatient) {
    return { isPatient: true, canProvider: false };
  }

  const { data: membership } = await service
    .from('provider_org_members')
    .select('role')
    .eq('organization_id', connection.organization_id)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  const role = membership?.role as string | undefined;
  const canProvider = role === 'owner' || role === 'administrator' || role === 'staff';
  return { isPatient: false, canProvider };
}

function validateCallerForKind(
  kind: NotifyKind,
  connection: ConnectionRow,
  caller: { isPatient: boolean; canProvider: boolean },
): string | null {
  switch (kind) {
    case 'request':
      if (connection.initiated_by === 'patient' && !caller.isPatient) {
        return 'Forbidden';
      }
      if (connection.initiated_by === 'provider' && !caller.canProvider) {
        return 'Forbidden';
      }
      return null;
    case 'accepted':
    case 'declined':
      if (connection.initiated_by === 'provider' && !caller.isPatient) {
        return 'Forbidden';
      }
      if (connection.initiated_by === 'patient' && !caller.canProvider) {
        return 'Forbidden';
      }
      return null;
    case 'cancelled':
      if (connection.initiated_by === 'patient' && !caller.isPatient) {
        return 'Forbidden';
      }
      if (connection.initiated_by === 'provider' && !caller.canProvider) {
        return 'Forbidden';
      }
      return null;
    case 'disconnected':
      return null;
    default:
      return 'Forbidden';
  }
}

function expectedStatusForKind(kind: NotifyKind): string {
  switch (kind) {
    case 'request':
      return 'pending';
    case 'accepted':
      return 'approved';
    case 'declined':
      return 'rejected';
    case 'cancelled':
      return 'cancelled';
    case 'disconnected':
      return 'disconnected';
  }
}

function getPatientPushRecipient(
  connection: ConnectionRow,
  kind: NotifyKind,
  caller: { isPatient: boolean; canProvider: boolean },
): string | null {
  switch (kind) {
    case 'request':
      return connection.initiated_by === 'provider' ? connection.patient_id : null;
    case 'accepted':
    case 'declined':
      return connection.initiated_by === 'patient' ? connection.patient_id : null;
    case 'cancelled':
      return connection.initiated_by === 'provider' ? connection.patient_id : null;
    case 'disconnected':
      return caller.isPatient ? null : connection.patient_id;
    default:
      return null;
  }
}

function buildPushCopy(
  kind: NotifyKind,
  orgName: string,
): { title: string; bodyText: string; eventType: string } {
  switch (kind) {
    case 'request':
      return {
        title: 'Provider connection request',
        bodyText: `${orgName} wants to connect with you on CareMate. Open Connections to respond.`,
        eventType: 'connection_request_received',
      };
    case 'accepted':
      return {
        title: 'Connection accepted',
        bodyText: `${orgName} accepted your connection request.`,
        eventType: 'connection_request_accepted',
      };
    case 'declined':
      return {
        title: 'Connection declined',
        bodyText: `${orgName} declined your connection request.`,
        eventType: 'connection_request_declined',
      };
    case 'cancelled':
      return {
        title: 'Connection request cancelled',
        bodyText: `${orgName} cancelled their connection request.`,
        eventType: 'connection_request_cancelled',
      };
    case 'disconnected':
      return {
        title: 'Connection ended',
        bodyText: `${orgName} ended your connection.`,
        eventType: 'connection_disconnected',
      };
  }
}
