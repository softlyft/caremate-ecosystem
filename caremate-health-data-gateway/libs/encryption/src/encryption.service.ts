import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '@caremate/supabase-client';
import {
  decryptField,
  encryptField,
  generateDek,
  parseMasterKey,
  unwrapDek,
  wrapDek,
} from './field-cipher';
import {
  decryptMiniAppPayload,
  encryptMiniAppPayload,
} from './mini-app-payload-cipher';

type UserEncryptionKeyRow = {
  user_id: string;
  wrapped_dek: string;
  key_version: number;
};

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly masterKey: Buffer;

  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
  ) {
    this.masterKey = parseMasterKey(
      this.config.getOrThrow<string>('GATEWAY_MASTER_KEY'),
    );
  }

  async bootstrapUserKey(userId: string): Promise<{
    created: boolean;
    keyVersion: number;
  }> {
    const existing = await this.getKeyRow(userId);
    if (existing) {
      return { created: false, keyVersion: existing.key_version };
    }

    const dek = generateDek();
    const wrappedDek = wrapDek(dek, this.masterKey);

    const { error } = await this.supabase.admin
      .from('user_encryption_keys')
      .insert({
        user_id: userId,
        wrapped_dek: wrappedDek,
        key_version: 1,
      });

    if (error) {
      // Race: another request created the key first.
      if (error.code === '23505') {
        const raced = await this.getKeyRow(userId);
        if (raced) {
          return { created: false, keyVersion: raced.key_version };
        }
      }
      this.logger.error(
        `Failed to persist DEK for ${userId}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Failed to bootstrap encryption key',
      );
    }

    return { created: true, keyVersion: 1 };
  }

  async encryptValue(
    userId: string,
    plaintext: string | null | undefined,
  ): Promise<string | null> {
    if (plaintext == null || plaintext === '') {
      return plaintext ?? null;
    }
    const dek = await this.resolveDek(userId);
    return encryptField(plaintext, dek);
  }

  async decryptValue(
    userId: string,
    stored: string | null | undefined,
  ): Promise<string | null> {
    if (stored == null || stored === '') {
      return stored ?? null;
    }
    const dek = await this.resolveDek(userId);
    return decryptField(stored, dek);
  }

  async encryptFields<T extends Record<string, unknown>>(
    userId: string,
    record: T,
    fields: readonly string[],
  ): Promise<T> {
    const out = { ...record };
    const dek = await this.resolveDek(userId);

    for (const field of fields) {
      const value = out[field];
      if (value == null || value === '') {
        continue;
      }
      const plaintext =
        typeof value === 'string' ? value : JSON.stringify(value);
      (out as Record<string, unknown>)[field] = encryptField(plaintext, dek);
    }

    return out;
  }

  async decryptFields<T extends Record<string, unknown>>(
    userId: string,
    record: T,
    fields: readonly string[],
    jsonFields: readonly string[] = [],
  ): Promise<T> {
    const out = { ...record };
    const dek = await this.resolveDek(userId);
    const jsonSet = new Set(jsonFields);

    for (const field of fields) {
      const value = out[field];
      if (value == null || value === '') {
        continue;
      }

      // Legacy plaintext JSON (array/object) written by mobile before gateway cutover.
      if (typeof value !== 'string') {
        continue;
      }

      const plaintext = decryptField(value, dek);
      if (jsonSet.has(field)) {
        try {
          (out as Record<string, unknown>)[field] = JSON.parse(plaintext);
        } catch {
          (out as Record<string, unknown>)[field] = plaintext;
        }
      } else {
        (out as Record<string, unknown>)[field] = plaintext;
      }
    }

    return out;
  }

  /** Encrypt clinical leaf values inside a mini-app snapshot payload (structure stays plaintext). */
  async encryptMiniAppSnapshotPayload(
    userId: string,
    appKey: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const dek = await this.resolveDek(userId);
    return encryptMiniAppPayload(appKey, payload, dek);
  }

  async decryptMiniAppSnapshotPayload(
    userId: string,
    appKey: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const dek = await this.resolveDek(userId);
    return decryptMiniAppPayload(appKey, payload, dek);
  }

  private async resolveDek(userId: string): Promise<Buffer> {
    let row = await this.getKeyRow(userId);
    if (!row) {
      await this.bootstrapUserKey(userId);
      row = await this.getKeyRow(userId);
    }
    if (!row) {
      throw new InternalServerErrorException('Encryption key unavailable');
    }
    return unwrapDek(row.wrapped_dek, this.masterKey);
  }

  private async getKeyRow(
    userId: string,
  ): Promise<UserEncryptionKeyRow | null> {
    const { data, error } = await this.supabase.admin
      .from('user_encryption_keys')
      .select('user_id, wrapped_dek, key_version')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to load DEK for ${userId}: ${error.message}`);
      throw new InternalServerErrorException('Failed to load encryption key');
    }

    return data;
  }
}
