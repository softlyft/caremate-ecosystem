import {
  ForbiddenException,
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
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
import {
  runEducationGraph,
  selectBoundedHistory,
  type EducationHistoryMessage,
} from './graph/education-graph';
import {
  isAiModelTimeoutError,
  classifyModelError,
} from './graph/model-errors';
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
  client_request_id?: string | null;
  parent_message_id?: string | null;
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

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
    await this.encryption.bootstrapUserKey(userId);

    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException('CareMate AI is not configured');
    }
    const modelName =
      this.config.get<string>('OPENAI_MODEL')?.trim() || 'gpt-4o-mini';

    const contentPlain = dto.content.trim();
    const clientRequestId = dto.clientRequestId?.trim() || null;

    if (clientRequestId) {
      const existing = await this.findUserMessageByClientRequest(
        conversationId,
        clientRequestId,
      );
      if (existing) {
        const finished = await this.tryReturnFinishedTurn(userId, existing);
        if (finished) {
          return finished;
        }
      }
    }

    // Atomic reservation (advisory lock). Finished idempotent replays return above.
    // Same clientRequestId reuses the slot after failure; a new id consumes again.
    await this.assertRateLimits(userId, clientRequestId);

    const now = new Date().toISOString();
    const encryptedUserContent = await this.encryption.encryptValue(
      userId,
      contentPlain,
    );
    if (!encryptedUserContent) {
      throw new InternalServerErrorException('Failed to encrypt message');
    }

    const turn = await this.resolveOrBeginUserTurn({
      conversationId,
      userId,
      encryptedUserContent,
      clientRequestId,
      now,
    });
    if (turn.kind === 'finished') {
      return turn.response;
    }

    const priorMessages = await this.loadPriorHistoryForModel(
      userId,
      conversationId,
    );
    const userRow = turn.userRow;

    const requestStarted = Date.now();
    let result;
    try {
      // Model call uses plaintext in memory only; at-rest storage stays encrypted.
      // Safety still classifies the current turn only; prior turns are generate context.
      result = await runEducationGraph({
        apiKey,
        modelName,
        userMessage: contentPlain,
        priorMessages,
      });
    } catch (err) {
      await this.markUserMessageStatus(userRow.id, 'failed');
      const classified = classifyModelError(err);
      const totalMs = Date.now() - requestStarted;
      this.logger.warn(
        `CareMate AI model failure user=${userId} conversation=${conversationId} ` +
          `code=${classified.code} total_ms=${totalMs}`,
      );
      if (isAiModelTimeoutError(classified)) {
        throw new GatewayTimeoutException(
          'CareMate AI took too long to respond. Please try again.',
        );
      }
      throw new ServiceUnavailableException(
        'CareMate AI is temporarily unavailable. Please try again shortly.',
      );
    }

    this.logger.log(
      `CareMate AI ok user=${userId} conversation=${conversationId} ` +
        `action=${result.safety.action} model_ms=${result.latencyMs} ` +
        `total_ms=${Date.now() - requestStarted}`,
    );

    const safetyState =
      result.safety.action === 'emergency'
        ? 'emergency'
        : result.safety.action === 'refuse'
          ? 'refused'
          : 'ok';
    const assistantStatus =
      result.safety.action === 'allow' ? 'complete' : 'refused';

    const encryptedAssistantContent = await this.encryption.encryptValue(
      userId,
      result.reply,
    );
    if (!encryptedAssistantContent) {
      await this.markUserMessageStatus(userRow.id, 'failed');
      throw new InternalServerErrorException('Failed to encrypt assistant reply');
    }

    const assistant = await this.persistAssistantReply({
      userId,
      conversationId,
      parentMessageId: userRow.id,
      content: encryptedAssistantContent,
      status: assistantStatus,
      model: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      safetyState,
      now,
    });

    const userComplete = await this.markUserMessageStatus(userRow.id, 'complete');

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
      userMessage: await this.decryptMessage(userId, userComplete),
      assistantMessage: await this.decryptMessage(userId, assistant),
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

  /**
   * Decrypt finished prior turns for model context.
   * Skips pending/failed so incomplete retries do not pollute the prompt.
   */
  private async loadPriorHistoryForModel(
    userId: string,
    conversationId: string,
  ): Promise<EducationHistoryMessage[]> {
    const messages = await this.supabase.admin
      .from('ai_message')
      .select('role, content, status, created_at')
      .eq('conversation_id', conversationId)
      .in('role', ['user', 'assistant'])
      .in('status', ['complete', 'refused'])
      .order('created_at', { ascending: true });

    if (messages.error) {
      throw new InternalServerErrorException(messages.error.message);
    }

    const rows = (messages.data ?? []) as Pick<
      AiMessageRow,
      'role' | 'content' | 'status' | 'created_at'
    >[];
    const decrypted: EducationHistoryMessage[] = [];
    for (const row of rows) {
      if (row.role !== 'user' && row.role !== 'assistant') {
        continue;
      }
      const plain = await this.decryptMessage(userId, {
        id: '',
        conversation_id: conversationId,
        role: row.role,
        content: row.content,
        status: row.status,
        model: null,
        prompt_tokens: null,
        completion_tokens: null,
        safety_state: 'ok',
        created_at: row.created_at,
      });
      decrypted.push({
        role: row.role,
        content: plain.content,
      });
    }

    return selectBoundedHistory(decrypted);
  }

  private async findUserMessageByClientRequest(
    conversationId: string,
    clientRequestId: string,
  ): Promise<AiMessageRow | null> {
    const result = await this.supabase.admin
      .from('ai_message')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('client_request_id', clientRequestId)
      .eq('role', 'user')
      .maybeSingle();

    if (result.error) {
      throw new InternalServerErrorException(result.error.message);
    }
    return (result.data as AiMessageRow | null) ?? null;
  }

  private async findAssistantForParent(
    parentMessageId: string,
  ): Promise<AiMessageRow | null> {
    const result = await this.supabase.admin
      .from('ai_message')
      .select('*')
      .eq('parent_message_id', parentMessageId)
      .eq('role', 'assistant')
      .maybeSingle();

    if (result.error) {
      throw new InternalServerErrorException(result.error.message);
    }
    return (result.data as AiMessageRow | null) ?? null;
  }

  private async tryReturnFinishedTurn(
    userId: string,
    userRow: AiMessageRow,
  ): Promise<{ userMessage: AiMessageRow; assistantMessage: AiMessageRow } | null> {
    const assistant = await this.findAssistantForParent(userRow.id);
    if (!assistant || assistant.status === 'failed') {
      return null;
    }
    if (userRow.status === 'pending' || userRow.status === 'failed') {
      await this.markUserMessageStatus(userRow.id, 'complete');
    }
    const freshUser = await this.getMessageById(userRow.id);
    return {
      userMessage: await this.decryptMessage(userId, freshUser ?? userRow),
      assistantMessage: await this.decryptMessage(userId, assistant),
    };
  }

  private async getMessageById(id: string): Promise<AiMessageRow | null> {
    const result = await this.supabase.admin
      .from('ai_message')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (result.error) {
      throw new InternalServerErrorException(result.error.message);
    }
    return (result.data as AiMessageRow | null) ?? null;
  }

  private async resolveOrBeginUserTurn(input: {
    conversationId: string;
    userId: string;
    encryptedUserContent: string;
    clientRequestId: string | null;
    now: string;
  }): Promise<
    | {
        kind: 'finished';
        response: { userMessage: AiMessageRow; assistantMessage: AiMessageRow };
      }
    | { kind: 'pending'; userRow: AiMessageRow }
  > {
    if (input.clientRequestId) {
      const existing = await this.findUserMessageByClientRequest(
        input.conversationId,
        input.clientRequestId,
      );
      if (existing) {
        const finished = await this.tryReturnFinishedTurn(
          input.userId,
          existing,
        );
        if (finished) {
          return { kind: 'finished', response: finished };
        }
        const updated = await this.supabase.admin
          .from('ai_message')
          .update({
            status: 'pending',
            content: input.encryptedUserContent,
            phi_encrypted_at: input.now,
          })
          .eq('id', existing.id)
          .select('*')
          .single();
        if (updated.error) {
          throw new InternalServerErrorException(updated.error.message);
        }
        return { kind: 'pending', userRow: updated.data as AiMessageRow };
      }
    }

    const insert = await this.supabase.admin
      .from('ai_message')
      .insert({
        conversation_id: input.conversationId,
        role: 'user',
        content: input.encryptedUserContent,
        status: 'pending',
        safety_state: 'ok',
        client_request_id: input.clientRequestId,
        phi_encrypted_at: input.now,
      })
      .select('*')
      .single();

    if (insert.error) {
      // Concurrent retry with same client_request_id — resume that row.
      if (input.clientRequestId && insert.error.code === '23505') {
        const raced = await this.findUserMessageByClientRequest(
          input.conversationId,
          input.clientRequestId,
        );
        if (raced) {
          const finished = await this.tryReturnFinishedTurn(
            input.userId,
            raced,
          );
          if (finished) {
            return { kind: 'finished', response: finished };
          }
          const updated = await this.markUserMessageStatus(raced.id, 'pending');
          return { kind: 'pending', userRow: updated };
        }
      }
      throw new InternalServerErrorException(insert.error.message);
    }

    return { kind: 'pending', userRow: insert.data as AiMessageRow };
  }

  private async markUserMessageStatus(
    messageId: string,
    status: 'pending' | 'complete' | 'failed' | 'refused',
  ): Promise<AiMessageRow> {
    const updated = await this.supabase.admin
      .from('ai_message')
      .update({ status })
      .eq('id', messageId)
      .select('*')
      .single();
    if (updated.error) {
      throw new InternalServerErrorException(updated.error.message);
    }
    return updated.data as AiMessageRow;
  }

  private async persistAssistantReply(input: {
    userId: string;
    conversationId: string;
    parentMessageId: string;
    content: string;
    status: string;
    model: string;
    promptTokens: number | null;
    completionTokens: number | null;
    safetyState: string;
    now: string;
  }): Promise<AiMessageRow> {
    const existing = await this.findAssistantForParent(input.parentMessageId);
    if (existing) {
      const updated = await this.supabase.admin
        .from('ai_message')
        .update({
          content: input.content,
          status: input.status,
          model: input.model,
          prompt_tokens: input.promptTokens,
          completion_tokens: input.completionTokens,
          safety_state: input.safetyState,
          phi_encrypted_at: input.now,
        })
        .eq('id', existing.id)
        .select('*')
        .single();
      if (updated.error) {
        throw new InternalServerErrorException(updated.error.message);
      }
      return updated.data as AiMessageRow;
    }

    const insert = await this.supabase.admin
      .from('ai_message')
      .insert({
        conversation_id: input.conversationId,
        role: 'assistant',
        content: input.content,
        status: input.status,
        model: input.model,
        prompt_tokens: input.promptTokens,
        completion_tokens: input.completionTokens,
        safety_state: input.safetyState,
        parent_message_id: input.parentMessageId,
        phi_encrypted_at: input.now,
      })
      .select('*')
      .single();

    if (insert.error) {
      if (insert.error.code === '23505') {
        const raced = await this.findAssistantForParent(input.parentMessageId);
        if (raced) {
          return raced;
        }
      }
      throw new InternalServerErrorException(insert.error.message);
    }
    return insert.data as AiMessageRow;
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

  /**
   * Atomic per-user quota via Postgres advisory lock + reservation row.
   * Same clientRequestId reuses the reservation (failed/retry does not double-count).
   * New clientRequestId always consumes a slot — including after a prior failure.
   */
  private async assertRateLimits(
    userId: string,
    clientRequestId: string | null,
  ) {
    const result = await this.supabase.admin.rpc('ai_consume_rate_limit', {
      p_user_id: userId,
      p_client_request_id: clientRequestId,
      p_daily_limit: DAILY_MESSAGE_LIMIT,
      p_burst_limit: BURST_LIMIT,
      p_burst_window_seconds: Math.round(BURST_WINDOW_MS / 1000),
    });

    if (result.error) {
      throw new InternalServerErrorException(result.error.message);
    }

    const payload = (result.data ?? {}) as {
      allowed?: boolean;
      reason?: string | null;
      idempotent?: boolean;
    };

    if (payload.allowed) {
      return;
    }

    if (payload.reason === 'burst') {
      throw new HttpException(
        'Too many CareMate AI messages. Wait a minute and try again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    throw new HttpException(
      'Daily CareMate AI message limit reached. Try again tomorrow.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
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
