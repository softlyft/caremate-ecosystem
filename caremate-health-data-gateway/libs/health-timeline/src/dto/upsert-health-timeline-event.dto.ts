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
  'pregnancy',
  'period',
  'immunization',
  'checkup',
] as const;

const KINDS = [
  'vital',
  'med_dose',
  'pregnancy_log',
  'tt_dose',
  'period_day',
  'vaccine',
  'checkup',
] as const;

export class UpsertHealthTimelineEventDto {
  @IsString()
  id!: string;

  @IsUUID()
  user_id!: string;

  @IsIn(APP_KEYS)
  app_key!: (typeof APP_KEYS)[number];

  @IsIn(KINDS)
  kind!: (typeof KINDS)[number];

  @IsString()
  occurred_on!: string;

  @IsOptional()
  @IsString()
  occurred_at?: string | null;

  @IsString()
  title!: string;

  @IsString()
  summary!: string;

  @IsOptional()
  @IsObject()
  @Allow()
  payload?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  updated_at?: string | null;
}
