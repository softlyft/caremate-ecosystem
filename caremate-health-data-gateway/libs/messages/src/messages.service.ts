import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  EncryptionService,
  isEncryptedEnvelope,
} from '@caremate/encryption';
import { SupabaseService } from '@caremate/supabase-client';
import { PostMessageDto, SealMessagesDto } from './dto/messages.dto';

type ConversationRow = {
  id: string;
  kind: 'org_patient' | 'direct';
  organization_id: string | null;
  patient_user_id: string | null;
  subject: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  preview_phi_key_user_id?: string | null;
  phi_encrypted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_party_type: 'user' | 'organization';
  sender_user_id: string | null;
  sender_organization_id: string | null;
  body: string;
  subject: string | null;
  phi_key_user_id?: string | null;
  phi_encrypted_at?: string | null;
  created_at: string;
  metadata?: unknown;
};

@Injectable()
export class MessagesService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly encryption: EncryptionService,
  ) {}

  async listConversations(authUserId: string) {
    const participantResult = await this.supabase.admin
      .from('message_participants')
      .select('conversation_id, last_read_at')
      .eq('party_type', 'user')
      .eq('user_id', authUserId);

    if (participantResult.error) {
      throw new InternalServerErrorException(participantResult.error.message);
    }

    const participation = (participantResult.data ?? []) as {
      conversation_id: string;
      last_read_at: string | null;
    }[];
    if (participation.length === 0) {
      return [];
    }

    const conversationIds = participation.map((p) => p.conversation_id);
    const listResult = await this.supabase.admin
      .from('message_conversations')
      .select('*')
      .in('id', conversationIds)
      .order('last_message_at', { ascending: false });

    if (listResult.error) {
      throw new InternalServerErrorException(listResult.error.message);
    }

    const rows = (listResult.data ?? []) as ConversationRow[];
    return Promise.all(rows.map((row) => this.decryptConversation(row)));
  }

  async listOrgConversations(authUserId: string, organizationId: string) {
    await this.requireOrgMember(authUserId, organizationId);

    const listResult = await this.supabase.admin
      .from('message_conversations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('kind', 'org_patient')
      .order('last_message_at', { ascending: false });

    if (listResult.error) {
      throw new InternalServerErrorException(listResult.error.message);
    }

    const rows = (listResult.data ?? []) as ConversationRow[];
    return Promise.all(rows.map((row) => this.decryptConversation(row)));
  }

  async listMessages(authUserId: string, conversationId: string) {
    await this.requireConversationAccess(authUserId, conversationId);

    const listResult = await this.supabase.admin
      .from('message_messages')
      .select(
        'id, conversation_id, sender_party_type, sender_user_id, sender_organization_id, body, subject, phi_key_user_id, phi_encrypted_at, created_at, metadata',
      )
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (listResult.error) {
      throw new InternalServerErrorException(listResult.error.message);
    }

    const rows = (listResult.data ?? []) as MessageRow[];
    return Promise.all(rows.map((row) => this.decryptMessage(row)));
  }

  async postReply(authUserId: string, dto: PostMessageDto) {
    const conversation = await this.requireConversationAccess(
      authUserId,
      dto.conversation_id,
    );

    const keyUserId = this.resolveKeyUserId(conversation, authUserId);
    await this.encryption.bootstrapUserKey(keyUserId);

    const body = dto.body.trim();
    if (!body) {
      throw new ForbiddenException('Message body is required');
    }

    const encryptedBody = await this.encryption.encryptValue(keyUserId, body);
    const encryptedSubject = await this.encryption.encryptValue(
      keyUserId,
      dto.subject ?? null,
    );
    const previewPlain = body.slice(0, 160);
    const encryptedPreview = await this.encryption.encryptValue(
      keyUserId,
      previewPlain,
    );

    const now = new Date().toISOString();
    const insertResult = await this.supabase.admin
      .from('message_messages')
      .insert({
        conversation_id: dto.conversation_id,
        sender_party_type: 'user',
        sender_user_id: authUserId,
        sender_organization_id: null,
        body: encryptedBody,
        subject: encryptedSubject,
        phi_key_user_id: keyUserId,
        phi_encrypted_at: now,
      })
      .select(
        'id, conversation_id, sender_party_type, sender_user_id, sender_organization_id, body, subject, phi_key_user_id, phi_encrypted_at, created_at',
      )
      .single();

    if (insertResult.error) {
      throw new InternalServerErrorException(insertResult.error.message);
    }

    await this.supabase.admin
      .from('message_conversations')
      .update({
        last_message_at: now,
        last_message_preview: encryptedPreview,
        preview_phi_key_user_id: keyUserId,
        phi_encrypted_at: now,
        updated_at: now,
      })
      .eq('id', dto.conversation_id);

    return this.decryptMessage(insertResult.data as MessageRow);
  }

  /**
   * Encrypt existing plaintext message rows in place (used after portal org fan-out RPCs).
   */
  async sealMessages(authUserId: string, dto: SealMessagesDto) {
    if (!dto.message_ids?.length) {
      return { sealed: 0 };
    }

    const listResult = await this.supabase.admin
      .from('message_messages')
      .select(
        'id, conversation_id, sender_party_type, sender_user_id, sender_organization_id, body, subject, phi_key_user_id, phi_encrypted_at, created_at',
      )
      .in('id', dto.message_ids);

    if (listResult.error) {
      throw new InternalServerErrorException(listResult.error.message);
    }

    const rows = (listResult.data ?? []) as MessageRow[];
    let sealed = 0;

    for (const row of rows) {
      if (row.phi_encrypted_at && isEncryptedEnvelope(row.body)) {
        continue;
      }

      const conversation = await this.requireConversationAccess(
        authUserId,
        row.conversation_id,
      );
      const keyUserId = this.resolveKeyUserId(
        conversation,
        row.sender_user_id ?? authUserId,
      );
      await this.encryption.bootstrapUserKey(keyUserId);

      const encryptedBody = await this.encryption.encryptValue(
        keyUserId,
        row.body,
      );
      const encryptedSubject = await this.encryption.encryptValue(
        keyUserId,
        row.subject,
      );
      const previewPlain = String(row.body ?? '').slice(0, 160);
      const encryptedPreview = await this.encryption.encryptValue(
        keyUserId,
        previewPlain,
      );
      const now = new Date().toISOString();

      const updateMsg = await this.supabase.admin
        .from('message_messages')
        .update({
          body: encryptedBody,
          subject: encryptedSubject,
          phi_key_user_id: keyUserId,
          phi_encrypted_at: now,
        })
        .eq('id', row.id);

      if (updateMsg.error) {
        throw new InternalServerErrorException(updateMsg.error.message);
      }

      await this.supabase.admin
        .from('message_conversations')
        .update({
          last_message_preview: encryptedPreview,
          preview_phi_key_user_id: keyUserId,
          phi_encrypted_at: now,
        })
        .eq('id', row.conversation_id)
        .eq('last_message_preview', String(row.body ?? '').slice(0, 160));

      sealed += 1;
    }

    return { sealed };
  }

  private resolveKeyUserId(
    conversation: ConversationRow,
    fallbackUserId: string,
  ): string {
    if (
      conversation.kind === 'org_patient' &&
      conversation.patient_user_id
    ) {
      return conversation.patient_user_id;
    }
    return fallbackUserId;
  }

  private async decryptMessage(row: MessageRow) {
    const keyUserId = row.phi_key_user_id;
    if (!keyUserId) {
      return row;
    }
    const body = await this.encryption.decryptValue(keyUserId, row.body);
    const subject = await this.encryption.decryptValue(keyUserId, row.subject);
    return { ...row, body: body ?? '', subject };
  }

  private async decryptConversation(row: ConversationRow) {
    const keyUserId =
      row.preview_phi_key_user_id ?? row.patient_user_id ?? null;
    if (!keyUserId || !row.last_message_preview) {
      return row;
    }
    const preview = await this.encryption.decryptValue(
      keyUserId,
      row.last_message_preview,
    );
    return { ...row, last_message_preview: preview };
  }

  private async requireConversationAccess(
    authUserId: string,
    conversationId: string,
  ): Promise<ConversationRow> {
    const getResult = await this.supabase.admin
      .from('message_conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle();

    if (getResult.error) {
      throw new InternalServerErrorException(getResult.error.message);
    }
    if (!getResult.data) {
      throw new NotFoundException('Conversation not found');
    }

    const conversation = getResult.data as ConversationRow;
    if (conversation.patient_user_id === authUserId) {
      return conversation;
    }

    const partResult = await this.supabase.admin
      .from('message_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('party_type', 'user')
      .eq('user_id', authUserId)
      .maybeSingle();

    if (partResult.error) {
      throw new InternalServerErrorException(partResult.error.message);
    }
    if (partResult.data) {
      return conversation;
    }

    if (conversation.organization_id) {
      await this.requireOrgMember(authUserId, conversation.organization_id);
      return conversation;
    }

    throw new ForbiddenException('Not allowed to access this conversation');
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
