import {
  BadRequestException,
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
      throw new ForbiddenException(
        'Cannot write another user emergency profile',
      );
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
      { ...dto },
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

  async getForConnectedPatient(
    staffUserId: string,
    patientId: string,
    organizationId: string,
  ) {
    await this.requireOrgConsent(staffUserId, patientId, organizationId, 'emergency');

    const { data, error } = await this.supabase.admin
      .from('emergency_profiles')
      .select('*')
      .eq('user_id', patientId)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    if (!data) {
      throw new NotFoundException('Emergency profile not found');
    }

    return this.encryption.decryptFields(
      patientId,
      data as Record<string, unknown>,
      EMERGENCY_PHI_FIELDS,
      EMERGENCY_JSON_PHI_FIELDS,
    );
  }

  private async requireOrgConsent(
    staffUserId: string,
    patientId: string,
    organizationId: string,
    code: string,
  ): Promise<void> {
    if (!organizationId) {
      throw new BadRequestException('organizationId is required');
    }

    const { data: member, error: memberError } = await this.supabase.admin
      .from('provider_org_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', staffUserId)
      .is('deleted_at', null)
      .maybeSingle();

    if (memberError) {
      throw new InternalServerErrorException(memberError.message);
    }
    if (!member) {
      throw new ForbiddenException('Not a member of this organization');
    }

    const { data: connection, error: connectionError } = await this.supabase.admin
      .from('patient_provider_connections')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('patient_id', patientId)
      .eq('status', 'approved')
      .maybeSingle();

    if (connectionError) {
      throw new InternalServerErrorException(connectionError.message);
    }
    if (!connection) {
      throw new ForbiddenException('No approved connection to this patient');
    }

    const { data: definition, error: defError } = await this.supabase.admin
      .from('consent_definitions')
      .select('id')
      .eq('code', code)
      .is('organization_id', null)
      .maybeSingle();

    if (defError) {
      throw new InternalServerErrorException(defError.message);
    }
    if (!definition) {
      throw new ForbiddenException('Consent definition not found');
    }

    const { data: grant, error: grantError } = await this.supabase.admin
      .from('patient_provider_consents')
      .select('id')
      .eq('connection_id', connection.id)
      .eq('definition_id', definition.id)
      .eq('status', 'active')
      .eq('provision_type', 'permit')
      .maybeSingle();

    if (grantError) {
      throw new InternalServerErrorException(grantError.message);
    }
    if (!grant) {
      throw new ForbiddenException('Patient has not granted this consent');
    }
  }
}
