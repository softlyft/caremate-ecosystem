import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DOCUMENT_PHI_FIELDS } from '@caremate/common';
import { EncryptionService } from '@caremate/encryption';
import { SupabaseService } from '@caremate/supabase-client';
import { UpsertDocumentDto } from './dto/upsert-document.dto';

type DocumentRow = {
  id: string;
  organization_id: string | null;
  patient_id: string;
  document_type: string;
  title: string;
  file_url: string;
  file_name: string | null;
  mime_type: string | null;
  uploaded_by: string | null;
  source: 'provider' | 'patient';
  created_at?: string | null;
  updated_at?: string | null;
  phi_encrypted_at?: string | null;
};

@Injectable()
export class DocumentsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly encryption: EncryptionService,
  ) {}

  async upsert(authUserId: string, dto: UpsertDocumentDto) {
    await this.requireWriteAccess(authUserId, dto);
    const keyUserId = dto.patient_id;
    await this.encryption.bootstrapUserKey(keyUserId);

    const encrypted = await this.encryption.encryptFields(
      keyUserId,
      {
        title: dto.title,
        file_name: dto.file_name ?? null,
      },
      DOCUMENT_PHI_FIELDS,
    );

    const row = {
      id: dto.id,
      organization_id: dto.organization_id ?? null,
      patient_id: dto.patient_id,
      document_type: dto.document_type,
      title: encrypted.title,
      file_url: dto.file_url,
      file_name: encrypted.file_name,
      mime_type: dto.mime_type ?? null,
      uploaded_by: dto.uploaded_by ?? authUserId,
      source: dto.source,
      phi_encrypted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const upsertResult = await this.supabase.admin
      .from('provider_documents')
      .upsert(row, { onConflict: 'id' })
      .select('*')
      .single();

    if (upsertResult.error) {
      throw new InternalServerErrorException(upsertResult.error.message);
    }

    return this.decryptDocument(upsertResult.data as DocumentRow);
  }

  async listMine(authUserId: string) {
    const listResult = await this.supabase.admin
      .from('provider_documents')
      .select('*')
      .eq('patient_id', authUserId)
      .order('created_at', { ascending: false });

    if (listResult.error) {
      throw new InternalServerErrorException(listResult.error.message);
    }

    const rows = (listResult.data ?? []) as DocumentRow[];
    return Promise.all(rows.map((row) => this.decryptDocument(row)));
  }

  async listForOrganization(authUserId: string, organizationId: string) {
    await this.requireOrgMember(authUserId, organizationId);

    const listResult = await this.supabase.admin
      .from('provider_documents')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (listResult.error) {
      throw new InternalServerErrorException(listResult.error.message);
    }

    const rows = (listResult.data ?? []) as DocumentRow[];
    return Promise.all(rows.map((row) => this.decryptDocument(row)));
  }

  async getOne(authUserId: string, documentId: string) {
    const getResult = await this.supabase.admin
      .from('provider_documents')
      .select('*')
      .eq('id', documentId)
      .maybeSingle();

    if (getResult.error) {
      throw new InternalServerErrorException(getResult.error.message);
    }
    if (!getResult.data) {
      throw new NotFoundException('Document not found');
    }

    const row = getResult.data as DocumentRow;
    await this.requireReadAccess(authUserId, row);
    return this.decryptDocument(row);
  }

  private async decryptDocument(row: DocumentRow) {
    return this.encryption.decryptFields(
      row.patient_id,
      row as unknown as Record<string, unknown>,
      DOCUMENT_PHI_FIELDS,
    );
  }

  private async requireWriteAccess(authUserId: string, dto: UpsertDocumentDto) {
    if (dto.source === 'patient') {
      if (dto.patient_id !== authUserId) {
        throw new ForbiddenException('Cannot write another patient document');
      }
      return;
    }

    if (!dto.organization_id) {
      throw new ForbiddenException('Provider documents require an organization');
    }
    await this.requireOrgMember(authUserId, dto.organization_id);
  }

  private async requireReadAccess(authUserId: string, row: DocumentRow) {
    if (row.patient_id === authUserId) {
      return;
    }
    if (row.organization_id) {
      await this.requireOrgMember(authUserId, row.organization_id);
      return;
    }
    throw new ForbiddenException('Not allowed to read this document');
  }

  private async requireOrgMember(authUserId: string, organizationId: string) {
    const memberResult = await this.supabase.admin
      .from('provider_org_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', authUserId)
      .is('deleted_at', null)
      .maybeSingle();

    if (memberResult.error) {
      throw new InternalServerErrorException(memberResult.error.message);
    }
    if (!memberResult.data) {
      throw new ForbiddenException('Not a member of this organization');
    }
  }
}
