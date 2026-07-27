import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PROFILE_PHI_FIELDS } from '@caremate/common';
import { EncryptionService } from '@caremate/encryption';
import { SupabaseService } from '@caremate/supabase-client';
import { UpsertProfileDto } from './dto/upsert-profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly encryption: EncryptionService,
  ) {}

  async upsert(authUserId: string, dto: UpsertProfileDto) {
    if (dto.user_id !== authUserId) {
      throw new ForbiddenException('Cannot write another user profile');
    }

    await this.encryption.bootstrapUserKey(authUserId);

    const encrypted = await this.encryption.encryptFields(
      authUserId,
      { ...dto },
      PROFILE_PHI_FIELDS,
    );

    const row = {
      ...encrypted,
      phi_encrypted_at: new Date().toISOString(),
      updated_at: dto.updated_at ?? new Date().toISOString(),
    };

    const { data, error } = await this.supabase.admin
      .from('profiles')
      .upsert(row)
      .select('*')
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return this.encryption.decryptFields(
      authUserId,
      data as Record<string, unknown>,
      PROFILE_PHI_FIELDS,
    );
  }

  async getOwn(authUserId: string) {
    const { data, error } = await this.supabase.admin
      .from('profiles')
      .select('*')
      .eq('user_id', authUserId)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    if (!data) {
      throw new NotFoundException('Profile not found');
    }

    return this.encryption.decryptFields(
      authUserId,
      data as Record<string, unknown>,
      PROFILE_PHI_FIELDS,
    );
  }
}
