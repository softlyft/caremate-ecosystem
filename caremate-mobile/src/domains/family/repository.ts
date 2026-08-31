import { and, eq, inArray, isNull } from 'drizzle-orm';

import { getDatabase } from '@/database/client';
import { familyConnectionRequests, familyHouseholds, familyMembers } from '@/database/schema';
import type {
  ChildProfileDraft,
  FamilyConnectionRequest,
  FamilyConnectionStatus,
  FamilyHousehold,
  FamilyMember,
  FamilyMemberGender,
  FamilyMemberKind,
} from '@/domains/family/types';
import {
  deleteFamilyMemberViaGateway,
  fetchFamilyMembersViaGateway,
  isHealthDataGatewayConfigured,
  scrubEncryptedText,
  upsertFamilyMemberViaGateway,
} from '@/domains/health-data-gateway';
import { createInAppNotification } from '@/domains/notifications/service';
import { supabase } from '@/lib/supabase';
import { BaseRepository } from '@/repositories/base-repository';
import { createId, nowIso } from '@/utils/helpers';

function asMemberKind(value: string): FamilyMemberKind {
  return value as FamilyMemberKind;
}

function asMemberGender(value: string | null): FamilyMemberGender | null {
  return value as FamilyMemberGender | null;
}

function asConnectionStatus(value: string): FamilyConnectionStatus {
  return value as FamilyConnectionStatus;
}

function mapHousehold(row: typeof familyHouseholds.$inferSelect): FamilyHousehold {
  return {
    id: row.id,
    createdByUserId: row.createdByUserId,
    name: row.name,
    syncStatus: row.syncStatus as FamilyHousehold['syncStatus'],
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapMember(row: typeof familyMembers.$inferSelect): FamilyMember {
  return {
    id: row.id,
    householdId: row.householdId,
    kind: row.kind as FamilyMemberKind,
    linkedUserId: row.linkedUserId,
    fullName: row.fullName,
    dateOfBirth: row.dateOfBirth,
    gender: (row.gender as FamilyMemberGender | null) ?? null,
    notes: row.notes,
    syncStatus: row.syncStatus as FamilyMember['syncStatus'],
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapRequest(row: typeof familyConnectionRequests.$inferSelect): FamilyConnectionRequest {
  return {
    id: row.id,
    householdId: row.householdId,
    fromUserId: row.fromUserId,
    toUserId: row.toUserId,
    toEmail: row.toEmail,
    toPhone: row.toPhone,
    status: row.status as FamilyConnectionStatus,
    inviteToken: row.inviteToken,
    syncStatus: row.syncStatus as FamilyConnectionRequest['syncStatus'],
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

class FamilyRepository extends BaseRepository {
  async findHouseholdForUser(userId: string): Promise<FamilyHousehold | null> {
    const db = getDatabase();
    const memberRows = await db
      .select()
      .from(familyMembers)
      .where(
        and(
          eq(familyMembers.linkedUserId, userId),
          isNull(familyMembers.deletedAt),
          inArray(familyMembers.kind, ['self', 'spouse']),
        ),
      )
      .limit(1);

    if (memberRows[0]) {
      const [household] = await db
        .select()
        .from(familyHouseholds)
        .where(
          and(
            eq(familyHouseholds.id, memberRows[0].householdId),
            isNull(familyHouseholds.deletedAt),
          ),
        )
        .limit(1);
      return household ? mapHousehold(household) : null;
    }

    const [owned] = await db
      .select()
      .from(familyHouseholds)
      .where(and(eq(familyHouseholds.createdByUserId, userId), isNull(familyHouseholds.deletedAt)))
      .limit(1);
    return owned ? mapHousehold(owned) : null;
  }

  async listMembers(householdId: string): Promise<FamilyMember[]> {
    const db = getDatabase();
    const rows = await db
      .select()
      .from(familyMembers)
      .where(and(eq(familyMembers.householdId, householdId), isNull(familyMembers.deletedAt)));
    return rows.map(mapMember);
  }

  async listChildren(householdId: string): Promise<FamilyMember[]> {
    const members = await this.listMembers(householdId);
    return members.filter((m) => m.kind === 'child');
  }

  async listIncomingRequests(userId: string): Promise<FamilyConnectionRequest[]> {
    const db = getDatabase();
    const rows = await db
      .select()
      .from(familyConnectionRequests)
      .where(
        and(
          eq(familyConnectionRequests.toUserId, userId),
          eq(familyConnectionRequests.status, 'pending'),
          isNull(familyConnectionRequests.deletedAt),
        ),
      );
    return rows.map(mapRequest);
  }

  async listOutgoingRequests(userId: string): Promise<FamilyConnectionRequest[]> {
    const db = getDatabase();
    const rows = await db
      .select()
      .from(familyConnectionRequests)
      .where(
        and(
          eq(familyConnectionRequests.fromUserId, userId),
          eq(familyConnectionRequests.status, 'pending'),
          isNull(familyConnectionRequests.deletedAt),
        ),
      );
    return rows.map(mapRequest);
  }

  async listPendingRequestsForHousehold(householdId: string): Promise<FamilyConnectionRequest[]> {
    const db = getDatabase();
    const rows = await db
      .select()
      .from(familyConnectionRequests)
      .where(
        and(
          eq(familyConnectionRequests.householdId, householdId),
          eq(familyConnectionRequests.status, 'pending'),
          isNull(familyConnectionRequests.deletedAt),
        ),
      );
    return rows.map(mapRequest);
  }

  async markConnectionRequestStatus(
    requestId: string,
    status: FamilyConnectionStatus,
  ): Promise<void> {
    const db = getDatabase();
    const timestamp = nowIso();
    await db
      .update(familyConnectionRequests)
      .set({ status, updatedAt: timestamp, syncStatus: 'synced' })
      .where(eq(familyConnectionRequests.id, requestId));
  }

  async softDeleteMemberLocal(memberId: string): Promise<void> {
    const db = getDatabase();
    const timestamp = nowIso();
    await db
      .update(familyMembers)
      .set({ deletedAt: timestamp, updatedAt: timestamp, syncStatus: 'synced' })
      .where(eq(familyMembers.id, memberId));
  }

  async createHouseholdWithChildren(params: {
    userId: string;
    selfFullName: string;
    children: ChildProfileDraft[];
  }): Promise<{ household: FamilyHousehold; members: FamilyMember[] }> {
    const existing = await this.findHouseholdForUser(params.userId);
    if (existing) {
      const members = await this.listMembers(existing.id);
      return { household: existing, members };
    }

    const db = getDatabase();
    const timestamp = nowIso();
    const householdId = await createId();
    const household: FamilyHousehold = {
      id: householdId,
      createdByUserId: params.userId,
      name: null,
      syncStatus: 'pending',
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await db.insert(familyHouseholds).values({
      id: household.id,
      createdByUserId: household.createdByUserId,
      name: household.name,
      syncStatus: 'pending',
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await this.queueSync({
      entityType: 'family_households',
      entityId: household.id,
      operation: 'create',
      payload: household,
    });

    const members: FamilyMember[] = [];

    const selfMember = await this.insertMember({
      householdId,
      kind: 'self',
      linkedUserId: params.userId,
      fullName: params.selfFullName,
      dateOfBirth: null,
      gender: null,
      notes: null,
    });
    members.push(selfMember);

    for (const child of params.children) {
      const member = await this.insertMember({
        householdId,
        kind: 'child',
        linkedUserId: null,
        fullName: child.fullName.trim(),
        dateOfBirth: child.dateOfBirth,
        gender: child.gender,
        notes: child.notes?.trim() || null,
      });
      members.push(member);
    }

    return { household, members };
  }

  async addChild(householdId: string, child: ChildProfileDraft): Promise<FamilyMember> {
    return this.insertMember({
      householdId,
      kind: 'child',
      linkedUserId: null,
      fullName: child.fullName.trim(),
      dateOfBirth: child.dateOfBirth,
      gender: child.gender,
      notes: child.notes?.trim() || null,
    });
  }

  async findMemberById(memberId: string): Promise<FamilyMember | null> {
    const db = getDatabase();
    const [row] = await db
      .select()
      .from(familyMembers)
      .where(and(eq(familyMembers.id, memberId), isNull(familyMembers.deletedAt)))
      .limit(1);
    return row ? mapMember(row) : null;
  }

  async updateChild(memberId: string, child: ChildProfileDraft): Promise<FamilyMember> {
    const existing = await this.findMemberById(memberId);
    if (!existing || existing.kind !== 'child') {
      throw new Error('Child profile not found');
    }

    const db = getDatabase();
    const timestamp = nowIso();
    const updated: FamilyMember = {
      ...existing,
      fullName: child.fullName.trim(),
      dateOfBirth: child.dateOfBirth,
      gender: child.gender,
      notes: child.notes?.trim() || null,
      syncStatus: 'pending',
      updatedAt: timestamp,
    };

    await db
      .update(familyMembers)
      .set({
        fullName: updated.fullName,
        dateOfBirth: updated.dateOfBirth,
        gender: updated.gender,
        notes: updated.notes,
        syncStatus: 'pending',
        updatedAt: timestamp,
      })
      .where(eq(familyMembers.id, memberId));

    await this.queueSync({
      entityType: 'family_members',
      entityId: updated.id,
      operation: 'update',
      payload: updated,
    });

    return updated;
  }

  private async insertMember(input: {
    householdId: string;
    kind: FamilyMemberKind;
    linkedUserId: string | null;
    fullName: string;
    dateOfBirth: string | null;
    gender: FamilyMemberGender | null;
    notes: string | null;
  }): Promise<FamilyMember> {
    const db = getDatabase();
    const timestamp = nowIso();
    const member: FamilyMember = {
      id: await createId(),
      householdId: input.householdId,
      kind: input.kind,
      linkedUserId: input.linkedUserId,
      fullName: input.fullName,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      notes: input.notes,
      syncStatus: 'pending',
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await db.insert(familyMembers).values({
      id: member.id,
      householdId: member.householdId,
      kind: member.kind,
      linkedUserId: member.linkedUserId,
      fullName: member.fullName,
      dateOfBirth: member.dateOfBirth,
      gender: member.gender,
      notes: member.notes,
      syncStatus: 'pending',
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await this.queueSync({
      entityType: 'family_members',
      entityId: member.id,
      operation: 'create',
      payload: member,
    });

    return member;
  }

  async saveConnectionRequestLocal(
    request: FamilyConnectionRequest,
    options?: { queue?: boolean },
  ): Promise<void> {
    const db = getDatabase();
    await db
      .insert(familyConnectionRequests)
      .values({
        id: request.id,
        householdId: request.householdId,
        fromUserId: request.fromUserId,
        toUserId: request.toUserId,
        toEmail: request.toEmail,
        toPhone: request.toPhone,
        status: request.status,
        inviteToken: request.inviteToken,
        syncStatus: request.syncStatus,
        deletedAt: request.deletedAt,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
      })
      .onConflictDoUpdate({
        target: familyConnectionRequests.id,
        set: {
          toUserId: request.toUserId,
          toEmail: request.toEmail,
          toPhone: request.toPhone,
          status: request.status,
          inviteToken: request.inviteToken,
          syncStatus: request.syncStatus,
          updatedAt: request.updatedAt,
          deletedAt: request.deletedAt,
        },
      });

    if (options?.queue) {
      await this.queueSync({
        entityType: 'family_connection_requests',
        entityId: request.id,
        operation: 'create',
        payload: request,
      });
    }
  }

  async upsertHouseholdLocal(household: FamilyHousehold): Promise<void> {
    const db = getDatabase();
    await db
      .insert(familyHouseholds)
      .values({
        id: household.id,
        createdByUserId: household.createdByUserId,
        name: household.name,
        syncStatus: household.syncStatus,
        deletedAt: household.deletedAt,
        createdAt: household.createdAt,
        updatedAt: household.updatedAt,
      })
      .onConflictDoUpdate({
        target: familyHouseholds.id,
        set: {
          name: household.name,
          syncStatus: household.syncStatus,
          updatedAt: household.updatedAt,
          deletedAt: household.deletedAt,
        },
      });
  }

  async upsertMemberLocal(member: FamilyMember): Promise<void> {
    const db = getDatabase();
    await db
      .insert(familyMembers)
      .values({
        id: member.id,
        householdId: member.householdId,
        kind: member.kind,
        linkedUserId: member.linkedUserId,
        fullName: member.fullName,
        dateOfBirth: member.dateOfBirth,
        gender: member.gender,
        notes: member.notes,
        syncStatus: member.syncStatus,
        deletedAt: member.deletedAt,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
      })
      .onConflictDoUpdate({
        target: familyMembers.id,
        set: {
          kind: member.kind,
          linkedUserId: member.linkedUserId,
          fullName: member.fullName,
          dateOfBirth: member.dateOfBirth,
          gender: member.gender,
          notes: member.notes,
          syncStatus: member.syncStatus,
          updatedAt: member.updatedAt,
          deletedAt: member.deletedAt,
        },
      });
  }

  async syncHouseholdToRemote(
    entityId: string,
    operation: string,
    payload: unknown,
  ): Promise<void> {
    if (operation === 'delete') {
      await supabase.from('family_households').delete().eq('id', entityId);
      return;
    }
    const household = payload as FamilyHousehold;
    await supabase.from('family_households').upsert({
      id: household.id,
      created_by_user_id: household.createdByUserId,
      name: household.name,
      updated_at: household.updatedAt,
      created_at: household.createdAt,
    });
  }

  async syncMemberToRemote(entityId: string, operation: string, payload: unknown): Promise<void> {
    if (operation === 'delete') {
      const viaGateway = await deleteFamilyMemberViaGateway(entityId);
      if (!viaGateway) {
        await supabase.from('family_members').delete().eq('id', entityId);
      }
      return;
    }
    const member = payload as FamilyMember;
    const gatewayRow = await upsertFamilyMemberViaGateway(member);
    if (gatewayRow) {
      return;
    }
    await supabase.from('family_members').upsert({
      id: member.id,
      household_id: member.householdId,
      kind: member.kind,
      linked_user_id: member.linkedUserId,
      full_name: member.fullName,
      date_of_birth: member.dateOfBirth,
      gender: member.gender,
      notes: member.notes,
      updated_at: member.updatedAt,
      created_at: member.createdAt,
    });
  }

  async syncRequestToRemote(entityId: string, operation: string, payload: unknown): Promise<void> {
    if (operation === 'delete') {
      await supabase.from('family_connection_requests').delete().eq('id', entityId);
      return;
    }
    const request = payload as FamilyConnectionRequest;
    await supabase.from('family_connection_requests').upsert({
      id: request.id,
      household_id: request.householdId,
      from_user_id: request.fromUserId,
      to_user_id: request.toUserId,
      to_email: request.toEmail,
      to_phone: request.toPhone,
      status: request.status,
      invite_token: request.inviteToken,
      updated_at: request.updatedAt,
      created_at: request.createdAt,
    });
  }

  async pullFromRemote(userId: string): Promise<void> {
    const { data: memberLinks, error: memberError } = await supabase
      .from('family_members')
      .select('household_id')
      .eq('linked_user_id', userId);

    if (memberError) {
      return;
    }

    const householdIds = Array.from(
      new Set((memberLinks ?? []).map((row) => row.household_id as string).filter(Boolean)),
    );

    const { data: owned } = await supabase
      .from('family_households')
      .select('id')
      .eq('created_by_user_id', userId);

    for (const row of owned ?? []) {
      if (row.id && !householdIds.includes(row.id)) {
        householdIds.push(row.id);
      }
    }

    if (householdIds.length === 0) {
      // Still pull incoming requests
      await this.pullRequestsForUser(userId);
      return;
    }

    const { data: households } = await supabase
      .from('family_households')
      .select('*')
      .in('id', householdIds);

    for (const row of households ?? []) {
      await this.upsertHouseholdLocal({
        id: row.id,
        createdByUserId: row.created_by_user_id,
        name: row.name,
        syncStatus: 'synced',
        deletedAt: null,
        createdAt: row.created_at ?? nowIso(),
        updatedAt: row.updated_at ?? nowIso(),
      });
    }

    const { data: members } = await supabase
      .from('family_members')
      .select('*')
      .in('household_id', householdIds);

    const gatewayMembers = await fetchFamilyMembersViaGateway();
    if (gatewayMembers) {
      for (const row of gatewayMembers) {
        await this.upsertMemberLocal({
          id: row.id,
          householdId: row.household_id,
          kind: asMemberKind(row.kind),
          linkedUserId: row.linked_user_id,
          fullName: row.full_name,
          dateOfBirth: scrubEncryptedText(row.date_of_birth),
          gender: asMemberGender(scrubEncryptedText(row.gender)),
          notes: scrubEncryptedText(row.notes),
          syncStatus: 'synced',
          deletedAt: null,
          createdAt: row.created_at ?? nowIso(),
          updatedAt: row.updated_at ?? nowIso(),
        });
      }
    } else if (isHealthDataGatewayConfigured()) {
      // Gateway is source of truth when configured — skip plaintext member pull.
    } else {
      for (const row of members ?? []) {
        await this.upsertMemberLocal({
          id: row.id,
          householdId: row.household_id,
          kind: asMemberKind(row.kind),
          linkedUserId: row.linked_user_id,
          fullName: row.full_name,
          dateOfBirth: scrubEncryptedText(row.date_of_birth),
          gender: asMemberGender(scrubEncryptedText(row.gender)),
          notes: scrubEncryptedText(row.notes),
          syncStatus: 'synced',
          deletedAt: null,
          createdAt: row.created_at ?? nowIso(),
          updatedAt: row.updated_at ?? nowIso(),
        });
      }
    }

    await this.pullRequestsForUser(userId);
  }

  private async pullRequestsForUser(userId: string): Promise<void> {
    const { data, error } = await supabase
      .from('family_connection_requests')
      .select('*')
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);

    if (error || !data) {
      return;
    }

    for (const row of data) {
      const status = asConnectionStatus(row.status);
      await this.saveConnectionRequestLocal({
        id: row.id,
        householdId: row.household_id,
        fromUserId: row.from_user_id,
        toUserId: row.to_user_id,
        toEmail: row.to_email,
        toPhone: row.to_phone,
        status,
        inviteToken: row.invite_token,
        syncStatus: 'synced',
        deletedAt: null,
        createdAt: row.created_at ?? nowIso(),
        updatedAt: row.updated_at ?? nowIso(),
      });

      // Local inbox cards when family connection state lands on this device.
      try {
        if (row.to_user_id === userId && status === 'pending') {
          await createInAppNotification({
            userId,
            domain: 'family',
            eventType: 'connection_request_received',
            title: 'Family connection request',
            body: 'Someone wants to connect with you in CareMate Family. Open Family to respond.',
            severity: 'important',
            entityType: 'family_connection_requests',
            entityId: row.id,
            dedupeKey: `family:request:${row.id}:pending`,
          });
        } else if (row.from_user_id === userId && status === 'accepted') {
          await createInAppNotification({
            userId,
            domain: 'family',
            eventType: 'connection_request_accepted',
            title: 'Family connection accepted',
            body: 'Your family connection request was accepted.',
            severity: 'info',
            entityType: 'family_connection_requests',
            entityId: row.id,
            dedupeKey: `family:request:${row.id}:accepted`,
          });
        } else if (row.from_user_id === userId && status === 'declined') {
          await createInAppNotification({
            userId,
            domain: 'family',
            eventType: 'connection_request_declined',
            title: 'Family connection declined',
            body: 'Your family connection request was declined.',
            severity: 'info',
            entityType: 'family_connection_requests',
            entityId: row.id,
            dedupeKey: `family:request:${row.id}:declined`,
          });
        }
      } catch {
        // Inbox write is best-effort; family sync must not fail because of it.
      }
    }
  }
}

export const familyRepository = new FamilyRepository();
