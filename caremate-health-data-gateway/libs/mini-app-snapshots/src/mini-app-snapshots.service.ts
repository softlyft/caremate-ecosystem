import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { EncryptionService } from '@caremate/encryption';
import { SupabaseService } from '@caremate/supabase-client';
import { UpsertMiniAppSnapshotDto } from './dto/upsert-mini-app-snapshot.dto';

type SnapshotRow = {
  id: string;
  user_id: string;
  app_key: string;
  payload: Record<string, unknown> | null;
  updated_at?: string | null;
  phi_encrypted_at?: string | null;
  created_at?: string | null;
};

@Injectable()
export class MiniAppSnapshotsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly encryption: EncryptionService,
  ) {}

  async upsert(authUserId: string, dto: UpsertMiniAppSnapshotDto) {
    if (dto.user_id !== authUserId) {
      throw new ForbiddenException(
        'Cannot write another user mini-app snapshot',
      );
    }

    await this.encryption.bootstrapUserKey(authUserId);

    const encryptedPayload =
      await this.encryption.encryptMiniAppSnapshotPayload(
        authUserId,
        dto.app_key,
        dto.payload ?? {},
      );

    const row = {
      id: dto.id,
      user_id: authUserId,
      app_key: dto.app_key,
      payload: encryptedPayload,
      phi_encrypted_at: new Date().toISOString(),
      updated_at: dto.updated_at ?? new Date().toISOString(),
    };

    const upsertResult = await this.supabase.admin
      .from('mini_app_snapshots')
      .upsert(row, { onConflict: 'id' })
      .select('*')
      .single();

    if (upsertResult.error) {
      throw new InternalServerErrorException(upsertResult.error.message);
    }

    return this.decryptRow(authUserId, upsertResult.data as SnapshotRow);
  }

  async listOwn(authUserId: string) {
    const listResult = await this.supabase.admin
      .from('mini_app_snapshots')
      .select('*')
      .eq('user_id', authUserId);

    if (listResult.error) {
      throw new InternalServerErrorException(listResult.error.message);
    }

    const rows = (listResult.data ?? []) as SnapshotRow[];
    return Promise.all(rows.map((row) => this.decryptRow(authUserId, row)));
  }

  async getOwn(authUserId: string, appKey: string) {
    const getResult = await this.supabase.admin
      .from('mini_app_snapshots')
      .select('*')
      .eq('user_id', authUserId)
      .eq('app_key', appKey)
      .maybeSingle();

    if (getResult.error) {
      throw new InternalServerErrorException(getResult.error.message);
    }
    if (!getResult.data) {
      throw new NotFoundException('Mini-app snapshot not found');
    }

    return this.decryptRow(authUserId, getResult.data as SnapshotRow);
  }

  private async decryptRow(authUserId: string, row: SnapshotRow) {
    const payload =
      row.payload &&
      typeof row.payload === 'object' &&
      !Array.isArray(row.payload)
        ? row.payload
        : {};

    const decryptedPayload =
      await this.encryption.decryptMiniAppSnapshotPayload(
        authUserId,
        row.app_key,
        payload,
      );

    return {
      ...row,
      payload: decryptedPayload,
    };
  }
}
