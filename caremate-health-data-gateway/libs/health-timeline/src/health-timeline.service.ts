import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { HEALTH_TIMELINE_PHI_FIELDS } from '@caremate/common';
import { EncryptionService } from '@caremate/encryption';
import { SupabaseService } from '@caremate/supabase-client';
import { UpsertHealthTimelineEventDto } from './dto/upsert-health-timeline-event.dto';

type TimelineRow = {
  id: string;
  user_id: string;
  app_key: string;
  kind: string;
  occurred_on: string;
  occurred_at: string | null;
  title: string;
  summary: string;
  payload: unknown;
  created_at?: string | null;
  updated_at?: string | null;
  phi_encrypted_at?: string | null;
};

@Injectable()
export class HealthTimelineService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly encryption: EncryptionService,
  ) {}

  async upsert(authUserId: string, dto: UpsertHealthTimelineEventDto) {
    if (dto.user_id !== authUserId) {
      throw new ForbiddenException('Cannot write another user health timeline event');
    }

    await this.encryption.bootstrapUserKey(authUserId);

    const encrypted = await this.encryption.encryptFields(
      authUserId,
      {
        title: dto.title,
        summary: dto.summary,
        payload: dto.payload ?? {},
      },
      HEALTH_TIMELINE_PHI_FIELDS,
    );

    const row = {
      id: dto.id,
      user_id: authUserId,
      app_key: dto.app_key,
      kind: dto.kind,
      occurred_on: dto.occurred_on,
      occurred_at: dto.occurred_at ?? null,
      title: encrypted.title,
      summary: encrypted.summary,
      payload: encrypted.payload,
      phi_encrypted_at: new Date().toISOString(),
      updated_at: dto.updated_at ?? new Date().toISOString(),
    };

    const { data, error } = await this.supabase.admin
      .from('health_timeline_events')
      .upsert(row, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return this.decryptRow(authUserId, data as TimelineRow);
  }

  async listOwn(authUserId: string) {
    const { data, error } = await this.supabase.admin
      .from('health_timeline_events')
      .select('*')
      .eq('user_id', authUserId)
      .order('occurred_on', { ascending: false });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    const rows = (data ?? []) as TimelineRow[];
    return Promise.all(rows.map((row) => this.decryptRow(authUserId, row)));
  }

  async deleteOwn(authUserId: string, eventId: string) {
    const { data, error } = await this.supabase.admin
      .from('health_timeline_events')
      .select('id, user_id')
      .eq('id', eventId)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    if (!data) {
      throw new NotFoundException('Health timeline event not found');
    }
    if (data.user_id !== authUserId) {
      throw new ForbiddenException('Cannot delete another user health timeline event');
    }

    const { error: deleteError } = await this.supabase.admin
      .from('health_timeline_events')
      .delete()
      .eq('id', eventId);

    if (deleteError) {
      throw new InternalServerErrorException(deleteError.message);
    }

    return { deleted: true };
  }

  async listForConnectedPatient(
    staffUserId: string,
    patientId: string,
    organizationId: string,
  ) {
    const window = await this.requireOrgConsent(
      staffUserId,
      patientId,
      organizationId,
      'health_timeline',
    );
    if (!window.periodStart || !window.periodEnd) {
      throw new ForbiddenException('Health timeline consent has no date window');
    }

    const { data, error } = await this.supabase.admin
      .from('health_timeline_events')
      .select('*')
      .eq('user_id', patientId)
      .gte('occurred_on', window.periodStart)
      .lte('occurred_on', window.periodEnd)
      .order('occurred_on', { ascending: false })
      .limit(200);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    const rows = (data ?? []) as TimelineRow[];
    return Promise.all(rows.map((row) => this.decryptRow(patientId, row)));
  }

  private async decryptRow(keyUserId: string, row: TimelineRow) {
    return this.encryption.decryptFields(
      keyUserId,
      row as unknown as Record<string, unknown>,
      HEALTH_TIMELINE_PHI_FIELDS,
      ['payload'],
    );
  }

  private async requireOrgConsent(
    staffUserId: string,
    patientId: string,
    organizationId: string,
    code: string,
  ): Promise<{ periodStart: string | null; periodEnd: string | null }> {
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
      .select('period_start, period_end, status, provision_type')
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

    return {
      periodStart: grant.period_start ?? null,
      periodEnd: grant.period_end ?? null,
    };
  }
}
