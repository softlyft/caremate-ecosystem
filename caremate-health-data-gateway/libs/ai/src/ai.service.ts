import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EncryptionService,
  isEncryptedEnvelope,
} from '@caremate/encryption';
import { SupabaseService } from '@caremate/supabase-client';
import { AiFeedbackDto, CreateAiConversationDto, PostAiMessageDto } from './dto/ai.dto';
import { runEducationGraph } from './graph/education-graph';
import { POLICY_VERSION } from './safety/policy';

const DAILY_MESSAGE_LIMIT = 30;
const BURST_LIMIT = 5;
const BURST_WINDOW_MS = 60_000;

type AiConversationRow = {
  id: string;
  user_id: string;
  title: string | null;
  status: string;
  retention_state: string;
  created_at: string;
  updated_at: string;
  phi_encrypted_at?: string | null;
};

type AiMessageRow = {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  status: string;
  model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  safety_state: string;
  created_at: string;
  phi_encrypted_at?: string | null;
};

@Injectable()
export class AiService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
    private readonly encryption: EncryptionService,
  ) {}

  async createConversation(userId: string, dto: CreateAiConversationDto) {
    await this.encryption.bootstrapUserKey(userId);
    const titlePlain = dto.title?.trim() || 'CareMate AI';
    const title = await this.encryption.encryptValue(userId, titlePlain);
    const now = new Date().toISOString();

    const insert = await this.supabase.admin
      .from('ai_conversation')
      .insert({
        user_id: userId,
        title,
        phi_encrypted_at: now,
      })
      .select('*')
      .single();

    if (insert.error) {
      throw new InternalServerErrorException(insert.error.message);
    }
    return this.decryptConversation(insert.data as AiConversationRow);
  }

  async listConversations(userId: string) {
    const list = await this.supabase.admin
      .from('ai_conversation')
      .select('*')
      .eq('user_id', userId)
      .eq('retention_state', 'active')
      .order('updated_at', { ascending: false });

    if (list.error) {
      throw new InternalServerErrorException(list.error.message);
    }
    const rows = (list.data ?? []) as AiConversationRow[];
    return Promise.all(rows.map((row) => this.decryptConversation(row)));
  }

  async getConversation(userId: string, conversationId: string) {
    const conversation = await this.requireConversation(userId, conversationId);
    const messages = await this.supabase.admin
      .from('ai_message')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messages.error) {
      throw new InternalServerErrorException(messages.error.message);
    }

    const rows = (messages.data ?? []) as AiMessageRow[];
    return {
      conversation,
      messages: await Promise.all(
        rows.map((row) => this.decryptMessage(userId, row)),
      ),
    };
  }

  async postMessage(userId: string, conversationId: string, dto: PostAiMessageDto) {
    await this.requireConversation(userId, conversationId);
    await this.assertRateLimits(userId);
    await this.encryption.bootstrapUserKey(userId);

    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException('CareMate AI is not configured');
    }
    const modelName =
      this.config.get<string>('OPENAI_MODEL')?.trim() || 'gpt-4o-mini';

    const contentPlain = dto.content.trim();
    const now = new Date().toISOString();
    const encryptedUserContent = await this.encryption.encryptValue(
      userId,
      contentPlain,
    );

    const userInsert = await this.supabase.admin
      .from('ai_message')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        content: encryptedUserContent,
        status: 'complete',
        safety_state: 'ok',
        phi_encrypted_at: now,
      })
      .select('*')
      .single();

    if (userInsert.error) {
      throw new InternalServerErrorException(userInsert.error.message);
    }

    let result;
    try {
      // Model call uses plaintext in memory only; at-rest storage stays encrypted.
      result = await runEducationGraph({
        apiKey,
        modelName,
        userMessage: contentPlain,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Model request failed';
      throw new InternalServerErrorException(message);
    }

    const safetyState =
      result.safety.action === 'emergency'
        ? 'emergency'
        : result.safety.action === 'refuse'
          ? 'refused'
          : 'ok';
    const status =
      result.safety.action === 'allow' ? 'complete' : 'refused';

    const encryptedAssistantContent = await this.encryption.encryptValue(
      userId,
      result.reply,
    );

    const assistantInsert = await this.supabase.admin
      .from('ai_message')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: encryptedAssistantContent,
        status,
        model: result.model,
        prompt_tokens: result.promptTokens,
        completion_tokens: result.completionTokens,
        safety_state: safetyState,
        phi_encrypted_at: now,
      })
      .select('*')
      .single();

    if (assistantInsert.error) {
      throw new InternalServerErrorException(assistantInsert.error.message);
    }

    const assistant = await this.decryptMessage(
      userId,
      assistantInsert.data as AiMessageRow,
    );

    if (result.safety.action !== 'allow') {
      await this.recordSafetyEvent({
        conversationId,
        messageId: assistant.id,
        userId,
        category: result.safety.category,
        severity: result.safety.action === 'emergency' ? 'critical' : 'warning',
        action: result.safety.action,
      });
    }

    await this.supabase.admin
      .from('ai_conversation')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)
      .eq('user_id', userId);

    return {
      userMessage: await this.decryptMessage(
        userId,
        userInsert.data as AiMessageRow,
      ),
      assistantMessage: assistant,
    };
  }

  async submitFeedback(
    userId: string,
    messageId: string,
    dto: AiFeedbackDto,
  ) {
    const messageLookup = await this.supabase.admin
      .from('ai_message')
      .select('id, conversation_id, role')
      .eq('id', messageId)
      .maybeSingle();

    if (messageLookup.error) {
      throw new InternalServerErrorException(messageLookup.error.message);
    }
    if (!messageLookup.data || messageLookup.data.role !== 'assistant') {
      throw new NotFoundException('Assistant message not found');
    }

    await this.requireConversation(
      userId,
      messageLookup.data.conversation_id as string,
    );
    await this.encryption.bootstrapUserKey(userId);

    const commentPlain = dto.comment?.trim() || null;
    const comment = commentPlain
      ? await this.encryption.encryptValue(userId, commentPlain)
      : null;
    const now = commentPlain ? new Date().toISOString() : null;

    const upsert = await this.supabase.admin.from('ai_feedback').upsert(
      {
        message_id: messageId,
        user_id: userId,
        rating: dto.rating,
        category: dto.category ?? null,
        comment,
        phi_encrypted_at: now,
      },
      { onConflict: 'message_id,user_id' },
    );

    if (upsert.error) {
      throw new InternalServerErrorException(upsert.error.message);
    }

    return { ok: true };
  }

  async deleteConversation(userId: string, conversationId: string) {
    await this.requireConversation(userId, conversationId);
    const update = await this.supabase.admin
      .from('ai_conversation')
      .update({
        retention_state: 'deleted',
        status: 'archived',
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
      .eq('user_id', userId);

    if (update.error) {
      throw new InternalServerErrorException(update.error.message);
    }
    return { ok: true };
  }

  private async requireConversation(userId: string, conversationId: string) {
    const result = await this.supabase.admin
      .from('ai_conversation')
      .select('*')
      .eq('id', conversationId)
      .eq('retention_state', 'active')
      .maybeSingle();

    if (result.error) {
      throw new InternalServerErrorException(result.error.message);
    }
    if (!result.data) {
      throw new NotFoundException('Conversation not found');
    }
    if ((result.data as AiConversationRow).user_id !== userId) {
      throw new ForbiddenException('Not allowed');
    }
    return this.decryptConversation(result.data as AiConversationRow);
  }

  private async decryptConversation(
    row: AiConversationRow,
  ): Promise<AiConversationRow> {
    if (!row.title) {
      return row;
    }
    if (!isEncryptedEnvelope(row.title)) {
      return row;
    }
    const title = await this.encryption.decryptValue(row.user_id, row.title);
    return { ...row, title: title ?? '' };
  }

  private async decryptMessage(
    ownerUserId: string,
    row: AiMessageRow,
  ): Promise<AiMessageRow> {
    if (!isEncryptedEnvelope(row.content)) {
      return row;
    }
    const content = await this.encryption.decryptValue(ownerUserId, row.content);
    return { ...row, content: content ?? '' };
  }

  private async assertRateLimits(userId: string) {
    const convIds = await this.listActiveConversationIds(userId);
    if (convIds.length === 0) {
      return;
    }
    const sinceDay = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const sinceMinute = new Date(Date.now() - BURST_WINDOW_MS).toISOString();

    const dayCount = await this.supabase.admin
      .from('ai_message')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'user')
      .in('conversation_id', convIds)
      .gte('created_at', sinceDay);
    if (dayCount.error) {
      throw new InternalServerErrorException(dayCount.error.message);
    }
    if ((dayCount.count ?? 0) >= DAILY_MESSAGE_LIMIT) {
      throw new HttpException(
        'Daily CareMate AI message limit reached. Try again tomorrow.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const burstCount = await this.supabase.admin
      .from('ai_message')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'user')
      .in('conversation_id', convIds)
      .gte('created_at', sinceMinute);
    if (burstCount.error) {
      throw new InternalServerErrorException(burstCount.error.message);
    }
    if ((burstCount.count ?? 0) >= BURST_LIMIT) {
      throw new HttpException(
        'Too many CareMate AI messages. Wait a minute and try again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async listActiveConversationIds(userId: string): Promise<string[]> {
    const list = await this.supabase.admin
      .from('ai_conversation')
      .select('id')
      .eq('user_id', userId)
      .eq('retention_state', 'active');
    if (list.error) {
      throw new InternalServerErrorException(list.error.message);
    }
    return ((list.data ?? []) as { id: string }[]).map((row) => row.id);
  }

  private async recordSafetyEvent(input: {
    conversationId: string;
    messageId: string;
    userId: string;
    category: string;
    severity: 'info' | 'warning' | 'critical';
    action: string;
  }) {
    await this.supabase.admin.from('ai_safety_event').insert({
      conversation_id: input.conversationId,
      message_id: input.messageId,
      user_id: input.userId,
      category: input.category,
      severity: input.severity,
      action: input.action,
      policy_version: POLICY_VERSION,
    });
  }
}
