import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { sendExpoPushNotification } from '../_shared/push.ts';
import { createServiceClient, createUserClient } from '../_shared/supabase.ts';

type NotifyBody = {
  documentId?: string;
  organizationId?: string;
  patientId?: string;
  title?: string;
  orgKind?: 'provider' | 'payer';
};

/**
 * Authenticated org → patient document notifier (in-app + Expo push).
 * Body: { documentId, organizationId, patientId, title, orgKind? }
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
    const documentId = body.documentId?.trim();
    const organizationId = body.organizationId?.trim();
    const patientId = body.patientId?.trim();
    const title = body.title?.trim();
    const orgKind = body.orgKind === 'payer' ? 'payer' : 'provider';

    if (!documentId || !organizationId || !patientId || !title) {
      return jsonResponse(
        { error: 'documentId, organizationId, patientId, and title are required' },
        400,
      );
    }

    const service = createServiceClient();

    if (orgKind === 'payer') {
      const { data: membership } = await service
        .from('payer_org_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .maybeSingle();

      const role = membership?.role as string | undefined;
      const canWrite = role === 'owner' || role === 'administrator' || role === 'staff';
      if (!canWrite) {
        return jsonResponse({ error: 'Forbidden' }, 403);
      }

      const { data: connection, error: connectionError } = await service
        .from('patient_payer_connections')
        .select('id, status')
        .eq('payer_organization_id', organizationId)
        .eq('patient_id', patientId)
        .eq('status', 'approved')
        .maybeSingle();

      if (connectionError) {
        return jsonResponse({ error: connectionError.message }, 500);
      }
      if (!connection) {
        return jsonResponse({ error: 'No approved connection' }, 403);
      }

      let resolvedTitle = title;
      const { data: document } = await service
        .from('payer_documents')
        .select('id, patient_id, payer_organization_id, title')
        .eq('id', documentId)
        .maybeSingle();

      if (document) {
        if (
          document.payer_organization_id !== organizationId ||
          document.patient_id !== patientId
        ) {
          return jsonResponse({ error: 'Document mismatch' }, 403);
        }
        if (typeof document.title === 'string' && document.title.trim()) {
          resolvedTitle = document.title.trim();
        }
      }

      const { data: org } = await service
        .from('payer_organizations')
        .select('name')
        .eq('id', organizationId)
        .maybeSingle();
      const orgName =
        (typeof org?.name === 'string' && org.name.trim()) || 'Your insurer';

      const pushResult = await sendExpoPushNotification({
        service,
        userId: patientId,
        domain: 'providers',
        eventType: 'document_uploaded',
        title: 'New document',
        body: `${orgName} shared "${resolvedTitle}" with you. Open Documents to view it.`,
        severity: 'important',
        dedupeKey: `payers:document_uploaded:${documentId}`,
        entityType: 'payer_documents',
        entityId: documentId,
        data: {
          documentId,
          organizationId,
          orgKind: 'payer',
          connectionId: connection.id,
          path: '/profile/documents',
        },
      });

      return jsonResponse({
        ok: true,
        push_delivery_status: pushResult.deliveryStatus,
        push_notification_id: pushResult.notificationId || null,
        push_error: pushResult.error ?? null,
      });
    }

    const { data: membership } = await service
      .from('provider_org_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    const role = membership?.role as string | undefined;
    const canWrite = role === 'owner' || role === 'administrator' || role === 'staff';
    if (!canWrite) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    const { data: connection, error: connectionError } = await service
      .from('patient_provider_connections')
      .select('id, status')
      .eq('organization_id', organizationId)
      .eq('patient_id', patientId)
      .eq('status', 'approved')
      .maybeSingle();

    if (connectionError) {
      return jsonResponse({ error: connectionError.message }, 500);
    }
    if (!connection) {
      return jsonResponse({ error: 'No approved connection' }, 403);
    }

    let resolvedTitle = title;
    let resolvedPatientId = patientId;
    const { data: document } = await service
      .from('provider_documents')
      .select('id, patient_id, organization_id, title, source')
      .eq('id', documentId)
      .maybeSingle();

    if (document) {
      if (
        document.organization_id !== organizationId ||
        document.patient_id !== patientId
      ) {
        return jsonResponse({ error: 'Document mismatch' }, 403);
      }
      if (typeof document.title === 'string' && document.title.trim()) {
        resolvedTitle = document.title.trim();
      }
      resolvedPatientId = document.patient_id as string;
    }

    const { data: org } = await service
      .from('provider_organizations')
      .select('name')
      .eq('id', organizationId)
      .maybeSingle();
    const orgName =
      (typeof org?.name === 'string' && org.name.trim()) || 'A provider';

    const pushResult = await sendExpoPushNotification({
      service,
      userId: resolvedPatientId,
      domain: 'providers',
      eventType: 'document_uploaded',
      title: 'New document',
      body: `${orgName} shared "${resolvedTitle}" with you. Open Documents to view it.`,
      severity: 'important',
      dedupeKey: `providers:document_uploaded:${documentId}`,
      entityType: 'provider_documents',
      entityId: documentId,
      data: {
        documentId,
        organizationId,
        connectionId: connection.id,
        path: '/profile/documents',
      },
    });

    return jsonResponse({
      ok: true,
      push_delivery_status: pushResult.deliveryStatus,
      push_notification_id: pushResult.notificationId || null,
      push_error: pushResult.error ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('notify-provider-document', message);
    return jsonResponse({ error: message }, 500);
  }
});
