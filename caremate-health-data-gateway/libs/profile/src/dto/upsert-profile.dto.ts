import { IsOptional, IsString, IsBoolean, IsUUID } from 'class-validator';

export class UpsertProfileDto {
  @IsString()
  id!: string;

  @IsUUID()
  user_id!: string;

  @IsString()
  full_name!: string;

  @IsOptional()
  @IsString()
  email?: string | null;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsString()
  date_of_birth?: string | null;

  @IsOptional()
  @IsString()
  avatar_url?: string | null;

  @IsOptional()
  @IsString()
  country_code?: string | null;

  @IsOptional()
  @IsString()
  language_code?: string | null;

  @IsOptional()
  @IsString()
  state?: string | null;

  @IsOptional()
  @IsString()
  gender?: string | null;

  @IsOptional()
  @IsString()
  address_line?: string | null;

  @IsOptional()
  @IsString()
  city?: string | null;

  @IsOptional()
  @IsString()
  postal_code?: string | null;

  @IsOptional()
  @IsString()
  national_id?: string | null;

  @IsOptional()
  @IsString()
  marital_status?: string | null;

  @IsOptional()
  @IsBoolean()
  is_health_practitioner?: boolean | null;

  @IsOptional()
  @IsString()
  patient_id?: string | null;

  @IsOptional()
  @IsString()
  emergency_share_token?: string | null;

  @IsOptional()
  @IsString()
  updated_at?: string | null;
}
