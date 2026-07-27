import {
  Allow,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

const APP_KEYS = [
  'vitals',
  'medication',
  'checkup',
  'immunization',
  'pregnancy',
  'period',
] as const;

export class UpsertMiniAppSnapshotDto {
  @IsString()
  id!: string;

  @IsUUID()
  user_id!: string;

  @IsIn(APP_KEYS)
  app_key!: (typeof APP_KEYS)[number];

  /** Zustand state blob — PHI leaves encrypted server-side; structure stays plaintext. */
  @IsObject()
  @Allow()
  payload!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  updated_at?: string | null;
}
