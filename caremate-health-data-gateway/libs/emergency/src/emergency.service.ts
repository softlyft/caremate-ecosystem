import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { EMERGENCY_PHI_FIELDS } from '@caremate/common';
import { EncryptionService } from '@caremate/encryption';
import { SupabaseService } from '@caremate/supabase-client';
import { UpsertEmergencyDto } from './dto/upsert-emergency.dto';

const EMERGENCY_JSON_PHI_FIELDS = [
  'allergies',
  'current_medications',
  'chronic_conditions',
  'emergency_contacts',
] as const;

@Injectable()
export class EmergencyService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly encryption: EncryptionService,
  ) {}

  async upsert(authUserId: string, dto: UpsertEmergencyDto) {
    if (dto.user_id !== authUserId) {
      throw new ForbiddenException('Cannot write another user emergency profile');
    }

    await this.encryption.bootstrapUserKey(authUserId);

    // One row per user_id — reuse the existing primary key so a fresh local id
    // does not trip the unique(user_id) constraint on insert.
    const { data: existing, error: lookupError } = await this.supabase.admin
      .from('emergency_profiles')
      .select('id')
      .eq('user_id', authUserId)
      .maybeSingle();

    if (lookupError) {
      throw new InternalServerErrorException(lookupError.message);
    }

    const encrypted = await this.encryption.encryptFields(
      authUserId,
      { ...dto } as Record<string, unknown>,
      EMERGENCY_PHI_FIELDS,
    );

    const row = {
      ...encrypted,
      id: existing?.id ?? dto.id,
      user_id: authUserId,
      phi_encrypted_at: new Date().toISOString(),
      updated_at: dto.updated_at ?? new Date().toISOString(),
    };

    const { data, error } = await this.supabase.admin
      .from('emergency_profiles')
      .upsert(row, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return this.encryption.decryptFields(
      authUserId,
      data as Record<string, unknown>,
      EMERGENCY_PHI_FIELDS,
      EMERGENCY_JSON_PHI_FIELDS,
    );
  }

  async getOwn(authUserId: string) {
    const { data, error } = await this.supabase.admin
      .from('emergency_profiles')
      .select('*')
      .eq('user_id', authUserId)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    if (!data) {
      throw new NotFoundException('Emergency profile not found');
    }

    return this.encryption.decryptFields(
      authUserId,
      data as Record<string, unknown>,
      EMERGENCY_PHI_FIELDS,
      EMERGENCY_JSON_PHI_FIELDS,
    );
  }
}
