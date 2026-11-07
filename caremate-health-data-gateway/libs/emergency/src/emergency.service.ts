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
    const existingLookup = await this.supabase.admin
      .from('emergency_profiles')
      .select('id')
      .eq('user_id', authUserId)
      .maybeSingle();

    if (existingLookup.error) {
      throw new InternalServerErrorException(existingLookup.error.message);
    }

    const encrypted = await this.encryption.encryptFields(
      authUserId,
      { ...dto },
      EMERGENCY_PHI_FIELDS,
    );

    const existing = existingLookup.data;
    const row = {
      ...encrypted,
      id: existing?.id ?? dto.id,
      user_id: authUserId,
      phi_encrypted_at: new Date().toISOString(),
      updated_at: dto.updated_at ?? new Date().toISOString(),
    };

    const upsertResult = await this.supabase.admin
      .from('emergency_profiles')
      .upsert(row, { onConflict: 'id' })
      .select('*')
      .single();

    if (upsertResult.error) {
      throw new InternalServerErrorException(upsertResult.error.message);
    }

    return this.encryption.decryptFields(
      authUserId,
      upsertResult.data as Record<string, unknown>,
      EMERGENCY_PHI_FIELDS,
      EMERGENCY_JSON_PHI_FIELDS,
    );
  }

  async getOwn(authUserId: string) {
    const lookup = await this.supabase.admin
      .from('emergency_profiles')
      .select('*')
      .eq('user_id', authUserId)
      .maybeSingle();

    if (lookup.error) {
      throw new InternalServerErrorException(lookup.error.message);
    }
    if (!lookup.data) {
      throw new NotFoundException('Emergency profile not found');
    }

    return this.encryption.decryptFields(
      authUserId,
      lookup.data as Record<string, unknown>,
      EMERGENCY_PHI_FIELDS,
      EMERGENCY_JSON_PHI_FIELDS,
    );
  }

  async getForConnectedPatient(
    staffUserId: string,
    patientId: string,
    organizationId: string,
  ) {
    await this.requireOrgConsent(
      staffUserId,
      patientId,
      organizationId,
      'emergency',
    );

    const lookup = await this.supabase.admin
      .from('emergency_profiles')
      .select('*')
      .eq('user_id', patientId)
      .maybeSingle();

    if (lookup.error) {
      throw new InternalServerErrorException(lookup.error.message);
    }
    if (!lookup.data) {
      throw new NotFoundException('Emergency profile not found');
    }

    return this.encryption.decryptFields(
      patientId,
      lookup.data as Record<string, unknown>,
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

    const memberResult = await this.supabase.admin
      .from('provider_org_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', staffUserId)
      .is('deleted_at', null)
      .maybeSingle();

    if (memberResult.error) {
      throw new InternalServerErrorException(memberResult.error.message);
    }
    if (!memberResult.data) {
      throw new ForbiddenException('Not a member of this organization');
    }

    const connectionResult = await this.supabase.admin
      .from('patient_provider_connections')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('patient_id', patientId)
      .eq('status', 'approved')
      .maybeSingle();

    if (connectionResult.error) {
      throw new InternalServerErrorException(connectionResult.error.message);
    }
    if (!connectionResult.data) {
      throw new ForbiddenException('No approved connection to this patient');
    }

    const connection = connectionResult.data;

    const definitionResult = await this.supabase.admin
      .from('consent_definitions')
      .select('id')
      .eq('code', code)
      .is('organization_id', null)
      .maybeSingle();

    if (definitionResult.error) {
      throw new InternalServerErrorException(definitionResult.error.message);
    }
    if (!definitionResult.data) {
      throw new ForbiddenException('Consent definition not found');
    }

    const definition = definitionResult.data;

    const grantResult = await this.supabase.admin
      .from('patient_provider_consents')
      .select('id')
      .eq('connection_id', connection.id)
      .eq('definition_id', definition.id)
      .eq('status', 'active')
      .eq('provision_type', 'permit')
      .maybeSingle();

    if (grantResult.error) {
      throw new InternalServerErrorException(grantResult.error.message);
    }
    if (!grantResult.data) {
      throw new ForbiddenException('Patient has not granted this consent');
    }
  }
}
