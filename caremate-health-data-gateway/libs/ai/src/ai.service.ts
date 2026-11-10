import {
  ConflictException,
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
import { EncryptionService, isEncryptedEnvelope } from '@caremate/encryption';
import { SupabaseService } from '@caremate/supabase-client';
import {
  AiFeedbackDto,
  CreateAiConversationDto,
  PostAiMessageDto,
} from './dto/ai.dto';
import {
  MAX_HISTORY_CHARS,
  MAX_HISTORY_MESSAGES,
  runEducationGraph,
  selectBoundedHistory,
  type EducationHistoryMessage,
} from './graph/education-graph';
import {
  AiModelProviderError,
  isAiModelTimeoutError,
  classifyModelError,
} from './graph/model-errors';
import {
  AI_PEER_POLL_MS,
  AI_PEER_WAIT_MS,
  AI_PROCESSING_LEASE_SECONDS,
  AI_STALE_PENDING_SECONDS,
  type AiClaimResult,
  waitUntil,
} from './processing-claim';
import { POLICY_VERSION } from './safety/policy';

const DAILY_MESSAGE_LIMIT = 5;
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
  processing_claimed_at?: string | null;
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
    await this.recoverStalePendingTurns(conversationId);
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

  async postMessage(
    userId: string,
    conversationId: string,
    dto: PostAiMessageDto,
  ) {
    await this.requireConversation(userId, conversationId);
    await this.encryption.bootstrapUserKey(userId);
    await this.recoverStalePendingTurns(conversationId);

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

    const claimed = await this.tryClaimUserMessage(turn.userRow.id);
    if (!claimed) {
      const peerFinished = await this.waitForFinishedTurn(
        userId,
        turn.userRow.id,
      );
      if (peerFinished) {
        return peerFinished;
      }
      throw new ConflictException({
        code: 'ai_turn_processing',
        message:
          'CareMate AI is still processing this message. Retry shortly with the same clientRequestId.',
      });
    }

    const requestStarted = Date.now();
    let userRow = turn.userRow;
    try {
      // Entire post-claim lifecycle: history → model → encrypt → transactional complete.
      userRow = await this.refreshClaimedUserContent(
        turn.userRow.id,
        encryptedUserContent,
        now,
      );

      const priorMessages = await this.loadPriorHistoryForModel(
        userId,
        conversationId,
      );

      // Model call uses plaintext in memory only; at-rest storage stays encrypted.
      // Safety still classifies the current turn only; prior turns are generate context.
      const result = await runEducationGraph({
        apiKey,
        modelName,
        userMessage: contentPlain,
        priorMessages,
      });

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
        throw new InternalServerErrorException(
          'Failed to encrypt assistant reply',
        );
      }

      const completed = await this.completeUserTurn({
        userMessageId: userRow.id,
        conversationId,
        content: encryptedAssistantContent,
        status: assistantStatus,
        model: result.model,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        safetyState,
        now,
      });

      // Best-effort side effects after the turn is durable.
      if (result.safety.action !== 'allow') {
        try {
          await this.recordSafetyEvent({
            conversationId,
            messageId: completed.assistantMessage.id,
            userId,
            category: result.safety.category,
            severity:
              result.safety.action === 'emergency' ? 'critical' : 'warning',
            action: result.safety.action,
          });
        } catch (sideErr) {
          this.logger.warn(
            `CareMate AI safety event write failed conversation=${conversationId}: ${
              sideErr instanceof Error ? sideErr.message : String(sideErr)
            }`,
          );
        }
      }

      const touched = await this.supabase.admin
        .from('ai_conversation')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId)
        .eq('user_id', userId);
      if (touched.error) {
        this.logger.warn(
          `CareMate AI conversation touch failed conversation=${conversationId}: ${touched.error.message}`,
        );
      }

      return {
        userMessage: await this.decryptMessage(userId, completed.userMessage),
        assistantMessage: await this.decryptMessage(
          userId,
          completed.assistantMessage,
        ),
      };
    } catch (err) {
      await this.failUserTurnBestEffort(userRow.id);
      const totalMs = Date.now() - requestStarted;
      const classified = classifyModelError(err);
      this.logger.warn(
        `CareMate AI turn failure user=${userId} conversation=${conversationId} ` +
          `code=${classified.code} total_ms=${totalMs}`,
      );
      if (err instanceof HttpException) {
        throw err;
      }
      if (isAiModelTimeoutError(err) || isAiModelTimeoutError(classified)) {
        throw new GatewayTimeoutException(
          'CareMate AI took too long to respond. Please try again.',
        );
      }
      if (err instanceof AiModelProviderError) {
        throw new ServiceUnavailableException(
          'CareMate AI is temporarily unavailable. Please try again shortly.',
        );
      }
      throw new InternalServerErrorException(
        err instanceof Error ? err.message : 'CareMate AI turn failed',
      );
    }
  }

  async submitFeedback(userId: string, messageId: string, dto: AiFeedbackDto) {
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
   * Decrypt a bounded window of finished prior turns for model context.
   * Fetches only the newest eligible rows from the DB (message budget), then
   * applies the char budget in memory. Skips pending/failed so incomplete
   * retries do not pollute the prompt.
   */
  private async loadPriorHistoryForModel(
    userId: string,
    conversationId: string,
  ): Promise<EducationHistoryMessage[]> {
    const { maxMessages, maxChars, fetchLimit } = this.historyBounds();

    // Newest-first + limit keeps decrypt work O(budget), not O(conversation).
    const messages = await this.supabase.admin
      .from('ai_message')
      .select('role, content, status, created_at')
      .eq('conversation_id', conversationId)
      .in('role', ['user', 'assistant'])
      .in('status', ['complete', 'refused'])
      .order('created_at', { ascending: false })
      .limit(fetchLimit);

    if (messages.error) {
      throw new InternalServerErrorException(messages.error.message);
    }

    const rows = (
      (messages.data ?? []) as Pick<
        AiMessageRow,
        'role' | 'content' | 'status' | 'created_at'
      >[]
    )
      // Restore chronological order for selectBoundedHistory / LangGraph.
      .slice()
      .reverse();

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

    return selectBoundedHistory(decrypted, { maxMessages, maxChars });
  }

  /** Explicit history budgets (env overrides; defaults match education-graph). */
  private historyBounds(): {
    maxMessages: number;
    maxChars: number;
    fetchLimit: number;
  } {
    const maxMessages = this.readPositiveInt(
      'AI_HISTORY_MAX_MESSAGES',
      MAX_HISTORY_MESSAGES,
    );
    const maxChars = this.readPositiveInt(
      'AI_HISTORY_MAX_CHARS',
      MAX_HISTORY_CHARS,
    );
    // Fetch exactly the message budget from DB; char trim still happens in memory.
    return { maxMessages, maxChars, fetchLimit: maxMessages };
  }

  private readPositiveInt(envKey: string, fallback: number): number {
    const raw = this.config.get<string>(envKey)?.trim();
    if (!raw) {
      return fallback;
    }
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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
  ): Promise<{
    userMessage: AiMessageRow;
    assistantMessage: AiMessageRow;
  } | null> {
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
        // Content/status updates happen only after winning the processing claim.
        return { kind: 'pending', userRow: existing };
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
          return { kind: 'pending', userRow: raced };
        }
      }
      throw new InternalServerErrorException(insert.error.message);
    }

    return { kind: 'pending', userRow: insert.data as AiMessageRow };
  }

  private async tryClaimUserMessage(messageId: string): Promise<boolean> {
    const result = await this.supabase.admin.rpc('ai_try_claim_user_message', {
      p_message_id: messageId,
      p_lease_seconds: AI_PROCESSING_LEASE_SECONDS,
    });
    if (result.error) {
      throw new InternalServerErrorException(result.error.message);
    }
    const payload = result.data as AiClaimResult | null;
    return Boolean(payload?.claimed);
  }

  private async recoverStalePendingTurns(
    conversationId: string,
  ): Promise<void> {
    const result = await this.supabase.admin.rpc(
      'ai_recover_stale_pending_turns',
      {
        p_conversation_id: conversationId,
        p_stale_seconds: AI_STALE_PENDING_SECONDS,
      },
    );
    if (result.error) {
      this.logger.warn(
        `CareMate AI stale pending recovery failed conversation=${conversationId}: ${result.error.message}`,
      );
      return;
    }
    const payload = result.data as {
      healed?: number;
      failed?: number;
    } | null;
    if ((payload?.healed ?? 0) > 0 || (payload?.failed ?? 0) > 0) {
      this.logger.log(
        `CareMate AI stale recovery conversation=${conversationId} ` +
          `healed=${payload?.healed ?? 0} failed=${payload?.failed ?? 0}`,
      );
    }
  }

  private async failUserTurnBestEffort(messageId: string): Promise<void> {
    const result = await this.supabase.admin.rpc('ai_fail_user_turn', {
      p_user_message_id: messageId,
    });
    if (result.error) {
      this.logger.warn(
        `CareMate AI fail-turn cleanup failed message=${messageId}: ${result.error.message}`,
      );
    }
  }

  private async completeUserTurn(input: {
    userMessageId: string;
    conversationId: string;
    content: string;
    status: string;
    model: string;
    promptTokens: number | null;
    completionTokens: number | null;
    safetyState: string;
    now: string;
  }): Promise<{ userMessage: AiMessageRow; assistantMessage: AiMessageRow }> {
    const result = await this.supabase.admin.rpc('ai_complete_user_turn', {
      p_user_message_id: input.userMessageId,
      p_conversation_id: input.conversationId,
      p_content: input.content,
      p_status: input.status,
      p_model: input.model,
      p_prompt_tokens: input.promptTokens,
      p_completion_tokens: input.completionTokens,
      p_safety_state: input.safetyState,
      p_phi_encrypted_at: input.now,
    });
    if (result.error) {
      throw new InternalServerErrorException(result.error.message);
    }
    const payload = result.data as {
      ok?: boolean;
      reason?: string;
      user_message?: AiMessageRow;
      assistant_message?: AiMessageRow;
    } | null;
    if (!payload?.ok || !payload.user_message || !payload.assistant_message) {
      throw new InternalServerErrorException(
        `Failed to complete AI turn (${payload?.reason ?? 'unknown'})`,
      );
    }
    return {
      userMessage: payload.user_message,
      assistantMessage: payload.assistant_message,
    };
  }

  private async refreshClaimedUserContent(
    messageId: string,
    encryptedUserContent: string,
    now: string,
  ): Promise<AiMessageRow> {
    const updated = await this.supabase.admin
      .from('ai_message')
      .update({
        status: 'pending',
        content: encryptedUserContent,
        phi_encrypted_at: now,
      })
      .eq('id', messageId)
      .select('*')
      .single();
    if (updated.error) {
      throw new InternalServerErrorException(updated.error.message);
    }
    return updated.data as AiMessageRow;
  }

  private async waitForFinishedTurn(
    userId: string,
    userMessageId: string,
  ): Promise<{
    userMessage: AiMessageRow;
    assistantMessage: AiMessageRow;
  } | null> {
    return waitUntil(
      async () => {
        const row = await this.getMessageById(userMessageId);
        if (!row) {
          return null;
        }
        return this.tryReturnFinishedTurn(userId, row);
      },
      { timeoutMs: AI_PEER_WAIT_MS, intervalMs: AI_PEER_POLL_MS },
    );
  }

  private async markUserMessageStatus(
    messageId: string,
    status: 'pending' | 'complete' | 'failed' | 'refused',
  ): Promise<AiMessageRow> {
    const patch: {
      status: typeof status;
      processing_claimed_at?: null;
    } = { status };
    if (status === 'complete' || status === 'failed' || status === 'refused') {
      // Release the lease when the turn leaves in-flight processing.
      patch.processing_claimed_at = null;
    }
    const updated = await this.supabase.admin
      .from('ai_message')
      .update(patch)
      .eq('id', messageId)
      .select('*')
      .single();
    if (updated.error) {
      throw new InternalServerErrorException(updated.error.message);
    }
    return updated.data as AiMessageRow;
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
    const content = await this.encryption.decryptValue(
      ownerUserId,
      row.content,
    );
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
