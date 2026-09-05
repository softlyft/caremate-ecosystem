import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createServiceClient, createUserClient } from '../_shared/supabase.ts';

const DELETED_USER_DISPLAY_NAME = 'Deleted user';

const PERSONAL_TABLES = [
  'emergency_profiles',
  'mini_app_snapshots',
  'health_timeline_events',
  'user_encryption_keys',
  'user_location_samples',
  'notification_devices',
  'notifications',
  'bookmarks',
  'article_reads',
  'settings',
  'checkout_handoffs',
  'community_join_verifications',
  'community_memberships',
  'community_profiles',
  'provider_favorites',
] as const;

/**
 * Authenticated: deidentify the caller's account.
 * Personal PHI is erased; org interaction history is retained under a tombstone profile.
 * Auth user is soft-deleted so the UUID remains and email can be re-registered.
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

    const userId = user.id;
    const service = createServiceClient();

    // Best-effort: cancel active provider subscriptions before deidentification.
    try {
      const { data: subscriptions } = await service
        .from('subscriptions')
        .select('id, provider, provider_subscription_id, status')
        .eq('user_id', userId)
        .in('status', ['active', 'trialing', 'past_due']);

      for (const sub of subscriptions ?? []) {
        const providerSubId =
          typeof sub.provider_subscription_id === 'string'
            ? sub.provider_subscription_id.trim()
            : '';
        if (!providerSubId) {
          continue;
        }
        if (sub.provider === 'stripe') {
          const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
          if (stripeKey) {
            await fetch(`https://api.stripe.com/v1/subscriptions/${providerSubId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${stripeKey}` },
            });
          }
        } else if (sub.provider === 'paystack') {
          const paystackKey = Deno.env.get('PAYSTACK_SECRET_KEY');
          if (paystackKey) {
            await fetch('https://api.paystack.co/subscription/disable', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${paystackKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ code: providerSubId, token: providerSubId }),
            });
          }
        }
      }
    } catch (err) {
      console.warn('delete-account billing cancel', err);
    }

    // Hard-erase personal PHI tables (best-effort per table).
    for (const table of PERSONAL_TABLES) {
      try {
        const { error } = await service.from(table).delete().eq('user_id', userId);
        if (error) {
          console.warn(`delete-account scrub ${table}`, error.message);
        }
      } catch (err) {
        console.warn(`delete-account scrub ${table}`, err);
      }
    }

    // Family households owned by the user (members/requests cascade from household).
    try {
      const { error } = await service
        .from('family_households')
        .delete()
        .eq('created_by_user_id', userId);
      if (error) {
        console.warn('delete-account scrub family_households', error.message);
      }
    } catch (err) {
      console.warn('delete-account scrub family_households', err);
    }

    // Clear spouse/adult links and incoming requests targeting this user.
    try {
      await service
        .from('family_members')
        .update({ linked_user_id: null })
        .eq('linked_user_id', userId);
    } catch (err) {
      console.warn('delete-account clear family_members.linked_user_id', err);
    }
    try {
      await service
        .from('family_connection_requests')
        .update({ to_user_id: null })
        .eq('to_user_id', userId);
    } catch (err) {
      console.warn('delete-account clear family_connection_requests.to_user_id', err);
    }
    try {
      await service.from('family_connection_requests').delete().eq('from_user_id', userId);
    } catch (err) {
      console.warn('delete-account scrub sent family_connection_requests', err);
    }

    // Tombstone profile for Care Portal joins.
    const { error: tombstoneError } = await service
      .from('profiles')
      .update({
        full_name: DELETED_USER_DISPLAY_NAME,
        email: null,
        phone: null,
        date_of_birth: null,
        avatar_url: null,
        address_line: null,
        city: null,
        state: null,
        postal_code: null,
        national_id: null,
        marital_status: null,
        gender: null,
        country_code: null,
        language_code: null,
        patient_id: null,
        emergency_share_token: null,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (tombstoneError) {
      console.warn('delete-account tombstone profile', tombstoneError.message);
    }

    // End active/pending org connections (history retained as disconnected/cancelled).
    const { error: connectionsError } = await service.rpc(
      'service_end_patient_connections_for_account_delete',
      { p_user_id: userId },
    );
    if (connectionsError) {
      console.warn('delete-account end connections', connectionsError.message);
    }

    // Kill sessions before soft-deleting auth.
    const { error: revokeError } = await service.rpc('admin_revoke_user_sessions', {
      target_user_id: userId,
    });
    if (revokeError) {
      console.warn('delete-account revoke sessions', revokeError.message);
    }

    const { error: deleteError } = await service.auth.admin.deleteUser(userId, true);
    if (deleteError) {
      // Soft delete may be unavailable on some projects — fall back to hard delete after scrub.
      console.warn('delete-account soft delete failed, trying hard delete', deleteError.message);
      const { error: hardDeleteError } = await service.auth.admin.deleteUser(userId);
      if (hardDeleteError) {
        return jsonResponse({ error: hardDeleteError.message }, 500);
      }
      return jsonResponse({ ok: true, mode: 'hard_deleted' });
    }

    return jsonResponse({ ok: true, mode: 'deidentified' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Delete failed';
    return jsonResponse({ error: message }, 500);
  }
});
