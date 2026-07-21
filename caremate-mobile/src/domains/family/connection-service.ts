import { APP_NAME, APP_STORE_URLS } from '@/constants/config';
import { familyRepository } from '@/domains/family/repository';
import type { FamilyConnectionRequest, FamilyLookupUser } from '@/domains/family/types';
import { AnalyticsEvents, trackEvent } from '@/lib/monitoring/analytics';
import { supabase } from '@/lib/supabase';
import { createId, nowIso } from '@/utils/helpers';

function normalizeQuery(raw: string): {
  email: string | null;
  phone: string | null;
  query: string;
} {
  const query = raw.trim();
  if (!query) {
    return { email: null, phone: null, query: '' };
  }

  if (query.includes('@')) {
    return { email: query.toLowerCase(), phone: null, query };
  }

  const phone = query.replace(/[^\d+]/g, '');
  return { email: null, phone, query };
}

/**
 * Plaintext message for someone who is not on CareMate yet.
 * No invite tokens or deep links — connection happens in-app after they install and sign up.
 */
export function buildSpouseInviteMessage(params: { fromName: string }): { message: string } {
  const message = [
    `${params.fromName} uses ${APP_NAME} Family Premium and wants to add you to their household.`,
    '',
    `Get ${APP_NAME}:`,
    `• iPhone: ${APP_STORE_URLS.ios}`,
    `• Android: ${APP_STORE_URLS.android}`,
    '',
    'After you create an account, open Family in the app so they can find you by email or phone and send a connection request.',
  ].join('\n');

  return { message };
}

class FamilyConnectionService {
  async lookupUser(emailOrPhone: string): Promise<FamilyLookupUser | null> {
    const { query } = normalizeQuery(emailOrPhone);
    if (!query) {
      throw new Error('Enter an email or phone number');
    }

    const { data, error } = await supabase.rpc('lookup_user_for_family_connect', {
      p_query: query,
    });

    if (error) {
      throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.user_id) {
      return null;
    }

    return {
      userId: row.user_id,
      fullName: row.full_name ?? 'CareMate user',
      email: row.email ?? null,
      phone: row.phone ?? null,
      dateOfBirth: row.date_of_birth ?? null,
      countryCode: row.country_code ?? null,
      state: row.state ?? null,
      avatarUrl: row.avatar_url ?? null,
    };
  }

  /** In-app adult invite — requires a matched CareMate account. Owner-only on the server. */
  async requestConnection(params: {
    householdId: string;
    fromUserId: string;
    fromName: string;
    emailOrPhone: string;
    matchedUser: FamilyLookupUser;
  }): Promise<{ request: FamilyConnectionRequest }> {
    const { email, phone } = normalizeQuery(params.emailOrPhone);
    const timestamp = nowIso();

    const { data, error } = await supabase.rpc('create_family_connection_request', {
      p_household_id: params.householdId,
      p_to_user_id: params.matchedUser.userId,
      p_to_email: email ?? undefined,
      p_to_phone: phone ?? undefined,
    });

    if (error) {
      throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;
    const request: FamilyConnectionRequest = {
      id: row?.id ?? (await createId()),
      householdId: params.householdId,
      fromUserId: params.fromUserId,
      toUserId: row?.to_user_id ?? params.matchedUser.userId,
      toEmail: row?.to_email ?? email,
      toPhone: row?.to_phone ?? phone,
      status: (row?.status as FamilyConnectionRequest['status']) ?? 'pending',
      inviteToken: null,
      syncStatus: 'synced',
      deletedAt: null,
      createdAt: row?.created_at ?? timestamp,
      updatedAt: row?.updated_at ?? timestamp,
    };

    await familyRepository.saveConnectionRequestLocal(request);
    trackEvent(AnalyticsEvents.familyRequestSent, { channel: 'remote' });

    // Best-effort SES email to the receiver (Edge Function; never blocks request create).
    void supabase.functions
      .invoke('notify-family-email', { body: { requestId: request.id } })
      .catch(() => {
        // Email is optional; offline / missing SES must not fail the connection flow.
      });

    return { request };
  }

  async cancelRequest(params: { requestId: string; userId: string }): Promise<void> {
    const { error } = await supabase.rpc('cancel_family_connection_request', {
      p_request_id: params.requestId,
    });

    if (error) {
      throw error;
    }

    await familyRepository.markConnectionRequestStatus(params.requestId, 'cancelled');
    await familyRepository.pullFromRemote(params.userId);
  }

  async removeAdultMember(params: { memberId: string; userId: string }): Promise<void> {
    const { error } = await supabase.rpc('remove_family_adult_member', {
      p_member_id: params.memberId,
    });

    if (error) {
      throw error;
    }

    await familyRepository.softDeleteMemberLocal(params.memberId);
    await familyRepository.pullFromRemote(params.userId);
  }

  async respondToRequest(params: {
    requestId: string;
    userId: string;
    accept: boolean;
    selfFullName: string;
  }): Promise<void> {
    const { error } = await supabase.rpc('respond_family_connection_request', {
      p_request_id: params.requestId,
      p_accept: params.accept,
      p_self_full_name: params.selfFullName,
    });

    if (error) {
      throw error;
    }

    await familyRepository.pullFromRemote(params.userId);
  }
}

export const familyConnectionService = new FamilyConnectionService();
