import { IsOptional, IsString, IsIn, IsUUID } from 'class-validator';

export class UpsertFamilyMemberDto {
  @IsString()
  id!: string;

  @IsString()
  household_id!: string;

  @IsIn(['self', 'spouse', 'child'])
  kind!: 'self' | 'spouse' | 'child';

  @IsOptional()
  @IsUUID()
  linked_user_id?: string | null;

  @IsString()
  full_name!: string;

  @IsOptional()
  @IsString()
  date_of_birth?: string | null;

  @IsOptional()
  @IsString()
  gender?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsString()
  created_at?: string | null;

  @IsOptional()
  @IsString()
  updated_at?: string | null;
}
