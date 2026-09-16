import { and, eq, inArray, isNull, or } from 'drizzle-orm';

import { getDatabase } from '@/database/client';
import {
  familyConnectionRequests,
  familyHouseholds,
  familyMembers,
  subscriptionEntitlements,
} from '@/database/schema';
import { isLocalEntitlementActive } from '@/domains/billing/period';
import type { PremiumTier } from '@/domains/billing/types';
import { selectActiveHouseholdId } from '@/domains/family/active-household';
import type {
  ChildProfileDraft,
  FamilyConnectionRequest,
  FamilyConnectionStatus,
  FamilyHousehold,
  FamilyInviteRelationship,
  FamilyMember,
  FamilyMemberGender,
  FamilyMemberKind,
} from '@/domains/family/types';
import { isFamilyInviteRelationship } from '@/domains/family/types';
import { selectVisibleChildren } from '@/domains/family/visible-children';
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
    relationship: isFamilyInviteRelationship(row.relationship) ? row.relationship : null,
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
    relationship: isFamilyInviteRelationship(row.relationship) ? row.relationship : 'spouse',
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
      );

    const activeHouseholdId = selectActiveHouseholdId(
      memberRows.map((row) => ({ kind: row.kind, householdId: row.householdId })),
    );

    if (activeHouseholdId) {
      const [household] = await db
        .select()
        .from(familyHouseholds)
        .where(and(eq(familyHouseholds.id, activeHouseholdId), isNull(familyHouseholds.deletedAt)))
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

  /**
   * Households whose children the user may see: own memberships/owned, plus
   * peer leftover households while Family Premium is active.
   */
  async listAccessibleHouseholdIds(userId: string): Promise<string[]> {
    const db = getDatabase();
    const ids = new Set<string>();

    const memberRows = await db
      .select({ householdId: familyMembers.householdId })
      .from(familyMembers)
      .where(
        and(
          eq(familyMembers.linkedUserId, userId),
          isNull(familyMembers.deletedAt),
          inArray(familyMembers.kind, ['self', 'spouse']),
        ),
      );
    for (const row of memberRows) {
      ids.add(row.householdId);
    }

    const owned = await db
      .select({ id: familyHouseholds.id })
      .from(familyHouseholds)
      .where(and(eq(familyHouseholds.createdByUserId, userId), isNull(familyHouseholds.deletedAt)));
    for (const row of owned) {
      ids.add(row.id);
    }

    const familySubs = await db
      .select()
      .from(subscriptionEntitlements)
      .where(
        and(
          eq(subscriptionEntitlements.planType, 'family'),
          isNull(subscriptionEntitlements.deletedAt),
        ),
      );

    for (const sub of familySubs) {
      if (!sub.householdId) continue;
      if (
        !isLocalEntitlementActive({
          status: sub.status,
          currentPeriodEnd: sub.currentPeriodEnd,
        })
      ) {
        continue;
      }

      const adults = await db
        .select()
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.householdId, sub.householdId),
            inArray(familyMembers.kind, ['self', 'spouse']),
            isNull(familyMembers.deletedAt),
          ),
        );

      const iAmAdult = adults.some((adult) => adult.linkedUserId === userId);
      const [premiumHousehold] = await db
        .select()
        .from(familyHouseholds)
        .where(and(eq(familyHouseholds.id, sub.householdId), isNull(familyHouseholds.deletedAt)))
        .limit(1);
      const iOwnPremium = premiumHousehold?.createdByUserId === userId;
      if (!iAmAdult && !iOwnPremium) continue;

      ids.add(sub.householdId);

      for (const adult of adults) {
        const peerUserId = adult.linkedUserId;
        if (!peerUserId) continue;

        const peerOwned = await db
          .select({ id: familyHouseholds.id })
          .from(familyHouseholds)
          .where(
            and(
              eq(familyHouseholds.createdByUserId, peerUserId),
              isNull(familyHouseholds.deletedAt),
            ),
          );
        for (const row of peerOwned) {
          ids.add(row.id);
        }

        const peerSelf = await db
          .select({ householdId: familyMembers.householdId })
          .from(familyMembers)
          .where(
            and(
              eq(familyMembers.linkedUserId, peerUserId),
              eq(familyMembers.kind, 'self'),
              isNull(familyMembers.deletedAt),
            ),
          );
        for (const row of peerSelf) {
          ids.add(row.householdId);
        }
      }
    }

    return Array.from(ids);
  }

  /**
   * Households the user may write members on (membership/owned only — not federated peers).
   */
  async listWritableHouseholdIds(userId: string): Promise<string[]> {
    const db = getDatabase();
    const ids = new Set<string>();

    const memberRows = await db
      .select({ householdId: familyMembers.householdId })
      .from(familyMembers)
      .where(
        and(
          eq(familyMembers.linkedUserId, userId),
          isNull(familyMembers.deletedAt),
          inArray(familyMembers.kind, ['self', 'spouse']),
        ),
      );
    for (const row of memberRows) {
      ids.add(row.householdId);
    }

    const owned = await db
      .select({ id: familyHouseholds.id })
      .from(familyHouseholds)
      .where(and(eq(familyHouseholds.createdByUserId, userId), isNull(familyHouseholds.deletedAt)));
    for (const row of owned) {
      ids.add(row.id);
    }

    return Array.from(ids);
  }

  /** Federated children across accessible households (no tier hide yet). */
  async listAccessibleChildren(userId: string): Promise<FamilyMember[]> {
    const householdIds = await this.listAccessibleHouseholdIds(userId);
    if (householdIds.length === 0) {
      return [];
    }

    const db = getDatabase();
    const rows = await db
      .select()
      .from(familyMembers)
      .where(
        and(
          inArray(familyMembers.householdId, householdIds),
          eq(familyMembers.kind, 'child'),
          isNull(familyMembers.deletedAt),
        ),
      );

    const byId = new Map<string, FamilyMember>();
    for (const row of rows) {
      byId.set(row.id, mapMember(row));
    }
    return Array.from(byId.values());
  }

  /** Federated children with over-cap rows hidden for the current tier. */
  async listVisibleAccessibleChildren(userId: string, tier: PremiumTier): Promise<FamilyMember[]> {
    const children = await this.listAccessibleChildren(userId);
    return selectVisibleChildren(children, tier);
  }

  async isFamilyPlanOwner(userId: string): Promise<boolean> {
    const household = await this.findHouseholdForUser(userId);
    if (!household) return false;
    return household.createdByUserId === userId;
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
    relationship?: FamilyInviteRelationship | null;
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
      relationship: input.relationship ?? null,
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
      relationship: member.relationship,
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
        relationship: request.relationship,
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
          relationship: request.relationship,
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
        relationship: member.relationship,
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
          relationship: member.relationship,
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
      relationship: member.relationship,
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
      relationship: request.relationship,
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

    // While Family Premium is active, also pull peer adults' leftover households
    // so federated children (spouse kids) are available locally without transfer.
    await this.appendFamilyPeerHouseholdIds(userId, householdIds);

    if (householdIds.length === 0) {
      // Still pull incoming requests; clear any stale invited-adult links.
      await this.softDeleteStaleSpouseMemberships(userId, []);
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

    const remoteMemberIds = new Set<string>();
    let sawDefinitiveMemberRoster = false;
    const gatewayMembers = await fetchFamilyMembersViaGateway();
    if (gatewayMembers) {
      sawDefinitiveMemberRoster = true;
      for (const row of gatewayMembers) {
        remoteMemberIds.add(row.id);
        await this.upsertMemberLocal({
          id: row.id,
          householdId: row.household_id,
          kind: asMemberKind(row.kind),
          relationship: isFamilyInviteRelationship(row.relationship) ? row.relationship : null,
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
      sawDefinitiveMemberRoster = true;
      for (const row of members ?? []) {
        remoteMemberIds.add(row.id);
        await this.upsertMemberLocal({
          id: row.id,
          householdId: row.household_id,
          kind: asMemberKind(row.kind),
          relationship: isFamilyInviteRelationship(row.relationship) ? row.relationship : null,
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

    // Revoke local cache for members removed remotely (incl. when this user was removed).
    if (sawDefinitiveMemberRoster) {
      await this.softDeleteMissingMembersInHouseholds(householdIds, remoteMemberIds);
    }
    await this.softDeleteStaleSpouseMemberships(userId, householdIds);

    await this.pullRequestsForUser(userId);
  }

  /** Soft-delete local members in known households that are no longer on the remote roster. */
  private async softDeleteMissingMembersInHouseholds(
    householdIds: string[],
    remoteMemberIds: Set<string>,
  ): Promise<void> {
    if (householdIds.length === 0) return;
    const db = getDatabase();
    const timestamp = nowIso();
    const localRows = await db
      .select({ id: familyMembers.id })
      .from(familyMembers)
      .where(
        and(inArray(familyMembers.householdId, householdIds), isNull(familyMembers.deletedAt)),
      );
    for (const row of localRows) {
      if (remoteMemberIds.has(row.id)) continue;
      await db
        .update(familyMembers)
        .set({ deletedAt: timestamp, updatedAt: timestamp, syncStatus: 'synced' })
        .where(eq(familyMembers.id, row.id));
    }
  }

  /**
   * Soft-delete invited-adult (`spouse`) links for this user whose household is no longer
   * returned by remote membership — e.g. owner removed them from Family Premium.
   */
  private async softDeleteStaleSpouseMemberships(
    userId: string,
    activeHouseholdIds: string[],
  ): Promise<void> {
    const db = getDatabase();
    const timestamp = nowIso();
    const localSpouse = await db
      .select({ id: familyMembers.id, householdId: familyMembers.householdId })
      .from(familyMembers)
      .where(
        and(
          eq(familyMembers.linkedUserId, userId),
          eq(familyMembers.kind, 'spouse'),
          isNull(familyMembers.deletedAt),
        ),
      );
    for (const row of localSpouse) {
      if (activeHouseholdIds.includes(row.householdId)) continue;
      await db
        .update(familyMembers)
        .set({ deletedAt: timestamp, updatedAt: timestamp, syncStatus: 'synced' })
        .where(eq(familyMembers.id, row.id));
    }
  }

  /** Expand `householdIds` with peer leftover households under active Family Premium. */
  private async appendFamilyPeerHouseholdIds(
    userId: string,
    householdIds: string[],
  ): Promise<void> {
    if (householdIds.length === 0) return;

    const { data: familySubs } = await supabase
      .from('subscriptions')
      .select('household_id, status, current_period_end')
      .eq('plan_type', 'family')
      .in('household_id', householdIds)
      .in('status', ['active', 'trialing']);

    const premiumHouseholdIds = (familySubs ?? [])
      .filter((row) =>
        isLocalEntitlementActive({
          status: String(row.status),
          currentPeriodEnd: row.current_period_end as string | null,
        }),
      )
      .map((row) => row.household_id as string)
      .filter(Boolean);

    if (premiumHouseholdIds.length === 0) return;

    const { data: adults } = await supabase
      .from('family_members')
      .select('household_id, linked_user_id, kind')
      .in('household_id', premiumHouseholdIds)
      .in('kind', ['self', 'spouse']);

    const peerUserIds = Array.from(
      new Set(
        (adults ?? [])
          .map((row) => row.linked_user_id as string | null)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    if (!peerUserIds.includes(userId)) {
      // Owner may only appear as created_by; still include peers from adults list.
    }

    for (const peerUserId of peerUserIds) {
      const { data: peerOwned } = await supabase
        .from('family_households')
        .select('id')
        .eq('created_by_user_id', peerUserId);
      for (const row of peerOwned ?? []) {
        if (row.id && !householdIds.includes(row.id)) {
          householdIds.push(row.id);
        }
      }

      const { data: peerSelf } = await supabase
        .from('family_members')
        .select('household_id')
        .eq('linked_user_id', peerUserId)
        .eq('kind', 'self');
      for (const row of peerSelf ?? []) {
        const id = row.household_id as string;
        if (id && !householdIds.includes(id)) {
          householdIds.push(id);
        }
      }
    }
  }

  private async pullRequestsForUser(userId: string): Promise<void> {
    const db = getDatabase();
    const previousRows = await db
      .select({
        id: familyConnectionRequests.id,
        status: familyConnectionRequests.status,
      })
      .from(familyConnectionRequests)
      .where(
        or(
          eq(familyConnectionRequests.fromUserId, userId),
          eq(familyConnectionRequests.toUserId, userId),
        ),
      );
    const previousStatusById = new Map(
      previousRows.map((row) => [row.id, asConnectionStatus(row.status)]),
    );

    const { data, error } = await supabase
      .from('family_connection_requests')
      .select('*')
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);

    if (error || !data) {
      return;
    }

    for (const row of data) {
      const status = asConnectionStatus(row.status);
      const previousStatus = previousStatusById.get(row.id) ?? null;

      await this.saveConnectionRequestLocal({
        id: row.id,
        householdId: row.household_id,
        fromUserId: row.from_user_id,
        toUserId: row.to_user_id,
        toEmail: row.to_email,
        toPhone: row.to_phone,
        status,
        inviteToken: row.invite_token,
        relationship: isFamilyInviteRelationship(row.relationship) ? row.relationship : 'spouse',
        syncStatus: 'synced',
        deletedAt: null,
        createdAt: row.created_at ?? nowIso(),
        updatedAt: row.updated_at ?? nowIso(),
      });

      // Inbox cards only on real transitions. Re-emitting on every pull resurfaced historical
      // "accepted" rows for the inviter whenever sync ran after sending a new invite.
      try {
        if (row.to_user_id === userId && status === 'pending' && previousStatus !== 'pending') {
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
        } else if (
          row.from_user_id === userId &&
          status === 'accepted' &&
          previousStatus === 'pending'
        ) {
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
        } else if (
          row.from_user_id === userId &&
          status === 'declined' &&
          previousStatus === 'pending'
        ) {
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
