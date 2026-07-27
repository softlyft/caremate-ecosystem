import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

const DOCUMENT_TYPES = [
  'prescription',
  'lab_result',
  'imaging_report',
  'referral_letter',
  'discharge_summary',
  'invoice',
] as const;

export class UpsertDocumentDto {
  @IsString()
  id!: string;

  @IsOptional()
  @IsUUID()
  organization_id?: string | null;

  @IsUUID()
  patient_id!: string;

  @IsIn(DOCUMENT_TYPES)
  document_type!: (typeof DOCUMENT_TYPES)[number];

  @IsString()
  title!: string;

  @IsString()
  file_url!: string;

  @IsOptional()
  @IsString()
  file_name?: string | null;

  @IsOptional()
  @IsString()
  mime_type?: string | null;

  @IsOptional()
  @IsUUID()
  uploaded_by?: string | null;

  @IsIn(['provider', 'patient'])
  source!: 'provider' | 'patient';
}
