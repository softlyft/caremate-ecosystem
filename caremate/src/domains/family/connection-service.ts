import { familyRepository } from '@/domains/family/repository';
import type { FamilyConnectionRequest, FamilyLookupUser } from '@/domains/family/types';
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

export function buildSpouseInviteMessage(params: { fromName: string; inviteToken: string }): {
  message: string;
  link: string;
} {
  const link = `https://caremate.app/family/invite?token=${params.inviteToken}`;
  const message = `${params.fromName} invited you to join their CareMate family.\n\nDownload CareMate and open this link after you sign up:\n${link}\n\nOr in the app, go to Me → Family and accept the request when it appears.`;
  return { message, link };
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

  async requestConnection(params: {
    householdId: string;
    fromUserId: string;
    fromName: string;
    emailOrPhone: string;
    matchedUser?: FamilyLookupUser | null;
  }): Promise<{ request: FamilyConnectionRequest; invite?: { message: string; link: string } }> {
    const { email, phone } = normalizeQuery(params.emailOrPhone);
    const timestamp = nowIso();
    const inviteToken = params.matchedUser ? null : await createId();

    const { data, error } = await supabase.rpc('create_family_connection_request', {
      p_household_id: params.householdId,
      p_to_user_id: params.matchedUser?.userId ?? null,
      p_to_email: email,
      p_to_phone: phone,
      p_invite_token: inviteToken,
    });

    if (error) {
      // Offline / RPC missing: fall back to local pending row.
      const local: FamilyConnectionRequest = {
        id: await createId(),
        householdId: params.householdId,
        fromUserId: params.fromUserId,
        toUserId: params.matchedUser?.userId ?? null,
        toEmail: email,
        toPhone: phone,
        status: 'pending',
        inviteToken,
        syncStatus: 'pending',
        deletedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await familyRepository.saveConnectionRequestLocal(local, { queue: true });

      return {
        request: local,
        invite: inviteToken
          ? buildSpouseInviteMessage({ fromName: params.fromName, inviteToken })
          : undefined,
      };
    }

    const row = Array.isArray(data) ? data[0] : data;
    const request: FamilyConnectionRequest = {
      id: row?.id ?? (await createId()),
      householdId: params.householdId,
      fromUserId: params.fromUserId,
      toUserId: row?.to_user_id ?? params.matchedUser?.userId ?? null,
      toEmail: row?.to_email ?? email,
      toPhone: row?.to_phone ?? phone,
      status: (row?.status as FamilyConnectionRequest['status']) ?? 'pending',
      inviteToken: row?.invite_token ?? inviteToken,
      syncStatus: 'synced',
      deletedAt: null,
      createdAt: row?.created_at ?? timestamp,
      updatedAt: row?.updated_at ?? timestamp,
    };

    await familyRepository.saveConnectionRequestLocal(request);

    return {
      request,
      invite: request.inviteToken
        ? buildSpouseInviteMessage({ fromName: params.fromName, inviteToken: request.inviteToken })
        : undefined,
    };
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
