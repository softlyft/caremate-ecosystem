import { Allow, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpsertEmergencyDto {
  @IsString()
  id!: string;

  @IsUUID()
  user_id!: string;

  @IsString()
  full_name!: string;

  @IsOptional()
  @IsString()
  photo_url?: string | null;

  @IsOptional()
  @IsString()
  blood_group?: string | null;

  @IsOptional()
  @IsString()
  genotype?: string | null;

  /** Plain arrays/objects from clients; stored as encrypted text. */
  @IsOptional()
  @Allow()
  allergies?: unknown;

  @IsOptional()
  @Allow()
  current_medications?: unknown;

  @IsOptional()
  @Allow()
  chronic_conditions?: unknown;

  @IsOptional()
  @Allow()
  emergency_contacts?: unknown;

  @IsOptional()
  @IsString()
  preferred_hospital?: string | null;

  @IsOptional()
  @IsString()
  insurance_provider?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsString()
  updated_at?: string | null;
}
