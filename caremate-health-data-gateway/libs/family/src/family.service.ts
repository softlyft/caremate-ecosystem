import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { FAMILY_MEMBER_PHI_FIELDS } from '@caremate/common';
import { EncryptionService } from '@caremate/encryption';
import { SupabaseService } from '@caremate/supabase-client';
import { UpsertFamilyMemberDto } from './dto/upsert-family-member.dto';

type HouseholdRow = {
  id: string;
  created_by_user_id: string;
  name: string | null;
};

type MemberRow = {
  id: string;
  household_id: string;
  kind: string;
  linked_user_id: string | null;
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  notes: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  phi_encrypted_at?: string | null;
};

@Injectable()
export class FamilyService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly encryption: EncryptionService,
  ) {}

  async upsertMember(authUserId: string, dto: UpsertFamilyMemberDto) {
    const household = await this.requireHouseholdAccess(
      authUserId,
      dto.household_id,
    );
    const keyUserId = household.created_by_user_id;
    await this.encryption.bootstrapUserKey(keyUserId);

    const encrypted = await this.encryption.encryptFields(
      keyUserId,
      {
        date_of_birth: dto.date_of_birth ?? null,
        gender: dto.gender ?? null,
        notes: dto.notes ?? null,
      },
      FAMILY_MEMBER_PHI_FIELDS,
    );

    const row = {
      id: dto.id,
      household_id: dto.household_id,
      kind: dto.kind,
      linked_user_id: dto.linked_user_id ?? null,
      full_name: dto.full_name,
      date_of_birth: encrypted.date_of_birth,
      gender: encrypted.gender,
      notes: encrypted.notes,
      phi_encrypted_at: new Date().toISOString(),
      updated_at: dto.updated_at ?? new Date().toISOString(),
      created_at: dto.created_at ?? new Date().toISOString(),
    };

    const upsertResult = await this.supabase.admin
      .from('family_members')
      .upsert(row, { onConflict: 'id' })
      .select('*')
      .single();

    if (upsertResult.error) {
      throw new InternalServerErrorException(upsertResult.error.message);
    }

    return this.decryptMember(keyUserId, upsertResult.data as MemberRow);
  }

  async listMembers(authUserId: string) {
    const householdIds = await this.listAccessibleHouseholdIds(authUserId);
    if (householdIds.length === 0) {
      return [];
    }

    const listResult = await this.supabase.admin
      .from('family_members')
      .select('*')
      .in('household_id', householdIds);

    if (listResult.error) {
      throw new InternalServerErrorException(listResult.error.message);
    }

    const households = await this.loadHouseholds(householdIds);
    const ownerByHousehold = new Map(
      households.map((h) => [h.id, h.created_by_user_id]),
    );

    const rows = (listResult.data ?? []) as MemberRow[];
    return Promise.all(
      rows.map((row) => {
        const keyUserId =
          ownerByHousehold.get(row.household_id) ?? authUserId;
        return this.decryptMember(keyUserId, row);
      }),
    );
  }

  async deleteMember(authUserId: string, memberId: string) {
    const getResult = await this.supabase.admin
      .from('family_members')
      .select('id, household_id')
      .eq('id', memberId)
      .maybeSingle();

    if (getResult.error) {
      throw new InternalServerErrorException(getResult.error.message);
    }
    if (!getResult.data) {
      return;
    }

    await this.requireHouseholdAccess(
      authUserId,
      String((getResult.data as { household_id: string }).household_id),
    );

    const delResult = await this.supabase.admin
      .from('family_members')
      .delete()
      .eq('id', memberId);

    if (delResult.error) {
      throw new InternalServerErrorException(delResult.error.message);
    }
  }

  private async decryptMember(keyUserId: string, row: MemberRow) {
    const decrypted = await this.encryption.decryptFields(
      keyUserId,
      row as unknown as Record<string, unknown>,
      FAMILY_MEMBER_PHI_FIELDS,
    );
    return decrypted;
  }

  private async requireHouseholdAccess(
    authUserId: string,
    householdId: string,
  ): Promise<HouseholdRow> {
    const getResult = await this.supabase.admin
      .from('family_households')
      .select('id, created_by_user_id, name')
      .eq('id', householdId)
      .maybeSingle();

    if (getResult.error) {
      throw new InternalServerErrorException(getResult.error.message);
    }
    if (!getResult.data) {
      throw new NotFoundException('Household not found');
    }

    const household = getResult.data as HouseholdRow;
    if (household.created_by_user_id === authUserId) {
      return household;
    }

    const linkResult = await this.supabase.admin
      .from('family_members')
      .select('id')
      .eq('household_id', householdId)
      .eq('linked_user_id', authUserId)
      .limit(1)
      .maybeSingle();

    if (linkResult.error) {
      throw new InternalServerErrorException(linkResult.error.message);
    }
    if (!linkResult.data) {
      throw new ForbiddenException('Not a member of this household');
    }

    return household;
  }

  private async listAccessibleHouseholdIds(
    authUserId: string,
  ): Promise<string[]> {
    const [owned, linked] = await Promise.all([
      this.supabase.admin
        .from('family_households')
        .select('id')
        .eq('created_by_user_id', authUserId),
      this.supabase.admin
        .from('family_members')
        .select('household_id')
        .eq('linked_user_id', authUserId),
    ]);

    if (owned.error) {
      throw new InternalServerErrorException(owned.error.message);
    }
    if (linked.error) {
      throw new InternalServerErrorException(linked.error.message);
    }

    return Array.from(
      new Set([
        ...((owned.data ?? []) as { id: string }[]).map((r) => r.id),
        ...((linked.data ?? []) as { household_id: string }[]).map(
          (r) => r.household_id,
        ),
      ]),
    );
  }

  private async loadHouseholds(ids: string[]): Promise<HouseholdRow[]> {
    if (ids.length === 0) return [];
    const result = await this.supabase.admin
      .from('family_households')
      .select('id, created_by_user_id, name')
      .in('id', ids);
    if (result.error) {
      throw new InternalServerErrorException(result.error.message);
    }
    return (result.data ?? []) as HouseholdRow[];
  }
}
