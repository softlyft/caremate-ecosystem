import { useNavigation } from 'expo-router';
import { Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react-native';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { glossyStackHeaderOptions } from '@/components/navigation/glossyStackHeader';
import { alert } from '@/components/ui/AppDialogHost';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import { MessageComposer, type MessageComposerHandle } from '@/components/ui/message-composer';
import { ErrorState, LoadingState, Screen } from '@/components/ui/screen-states';
import {
  useAiConversation,
  useAiFeedback,
  useEnsureAiConversation,
  usePostAiMessage,
} from '@/domains/ai/hooks';
import type { AiMessage } from '@/domains/ai/types';
import {
  HealthDataGatewayError,
  isHealthDataGatewayConfigured,
} from '@/domains/health-data-gateway/client';
import { useTranslation } from '@/domains/localization';
import { useComposerKeyboardLift } from '@/hooks/use-composer-keyboard-lift';
import {
  trackAiChatOpened,
  trackAiConversationStarted,
  trackAiMessageSent,
  trackAiResponseFailed,
  trackAiResponseFeedback,
  trackAiResponseGenerated,
  trackAiSafetyEscalation,
} from '@/lib/monitoring/product-analytics';
import { layoutSpacing, palette, primaryAlpha, radius, spacing } from '@/theme';

const STACK_HEADER_HEIGHT = 64;
const OPTIMISTIC_USER_ID = 'optimistic-user';
const TYPING_ROW_ID = 'assistant-typing';

function MessageBubble({
  message,
  onFeedback,
  thinkingLabel,
}: {
  message: AiMessage;
  onFeedback?: (rating: 'up' | 'down') => void;
  thinkingLabel?: string;
}) {
  const isUser = message.role === 'user';
  const isTyping = message.id === TYPING_ROW_ID;
  const showFeedback = !isUser && !isTyping && message.role === 'assistant' && onFeedback;

  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
          message.safety_state === 'emergency' ? styles.bubbleEmergency : null,
        ]}
      >
        {isTyping ? (
          <View style={styles.typingRow}>
            <ActivityIndicator color={palette.primaryDark} size="small" />
            <AppText variant="body" style={styles.bubbleTextAssistant}>
              {thinkingLabel}
            </AppText>
          </View>
        ) : (
          <AppText
            variant="body"
            style={isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant}
          >
            {message.content}
          </AppText>
        )}
        {showFeedback ? (
          <View style={styles.feedbackRow}>
            <Button
              variant="plain"
              accessibilityRole="button"
              accessibilityLabel="Helpful"
              onPress={() => onFeedback('up')}
              style={styles.feedbackBtn}
            >
              <ThumbsUp size={16} color={palette.primaryDark} />
            </Button>
            <Button
              variant="plain"
              accessibilityRole="button"
              accessibilityLabel="Not helpful"
              onPress={() => onFeedback('down')}
              style={styles.feedbackBtn}
            >
              <ThumbsDown size={16} color={palette.textSecondary} />
            </Button>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function CareMateAiThreadScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const composerRef = useRef<MessageComposerHandle>(null);
  const listRef = useRef<FlatList<AiMessage>>(null);
  const gatewayConfigured = isHealthDataGatewayConfigured();
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [bootstrapping, setBootstrapping] = useState(gatewayConfigured);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [draft, setDraft] = useState('');
  /** Local optimistic user bubble until the server turn lands in the query cache. */
  const [pendingUser, setPendingUser] = useState<AiMessage | null>(null);
  const ensure = useEnsureAiConversation();
  const detail = useAiConversation(conversationId);
  const postMessage = usePostAiMessage(conversationId ?? '');
  const feedback = useAiFeedback();
  const startedRef = useRef(false);
  /** Reuse idempotency key when retrying the same draft after a failed send. */
  const pendingRequestRef = useRef<{ content: string; clientRequestId: string } | null>(null);
  const { lift, composerPaddingBottom } = useComposerKeyboardLift();
  const isIOS = Platform.OS === 'ios';
  const keyboardVerticalOffset = isIOS ? insets.top + STACK_HEADER_HEIGHT : 0;

  useLayoutEffect(() => {
    navigation.setOptions(
      glossyStackHeaderOptions({
        title: t('messages.aiTitle'),
        accent: palette.primary,
        soft: palette.primaryLight,
        softEnd: '#F0FDFA',
        titleColor: palette.primaryDark,
        icon: Sparkles,
        backAccessibilityLabel: t('nav.backToMessages'),
      }),
    );
  }, [navigation, t]);

  useEffect(() => {
    trackAiChatOpened();
    if (!gatewayConfigured) {
      return;
    }
    void (async () => {
      try {
        setBootstrapError(null);
        const conv = await ensure.mutateAsync();
        setConversationId(conv.id);
        if (!startedRef.current) {
          startedRef.current = true;
          trackAiConversationStarted();
        }
      } catch (error) {
        setBootstrapError(
          error instanceof Error ? error.message : t('messages.aiUnavailableMessage'),
        );
      } finally {
        setBootstrapping(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap once
  }, []);

  const messages = useMemo(() => {
    const serverMessages = detail.data?.messages ?? [];
    const rows = [...serverMessages];
    const pendingStillMissing =
      pendingUser &&
      !serverMessages.some(
        (m) =>
          m.id === pendingUser.id ||
          (pendingUser.client_request_id != null &&
            m.client_request_id === pendingUser.client_request_id) ||
          (m.role === 'user' && m.content === pendingUser.content && m.status !== 'failed'),
      );
    if (pendingStillMissing && pendingUser) {
      rows.push(pendingUser);
    }
    if (waiting) {
      rows.push({
        id: TYPING_ROW_ID,
        conversation_id: conversationId ?? '',
        role: 'assistant',
        content: '',
        status: 'pending',
        model: null,
        prompt_tokens: null,
        completion_tokens: null,
        safety_state: 'ok',
        created_at: new Date().toISOString(),
      });
    }
    return rows;
  }, [detail.data?.messages, pendingUser, waiting, conversationId]);

  // Drop the optimistic bubble once the real turn is in the query cache.
  useEffect(() => {
    if (!pendingUser) {
      return;
    }
    const serverMessages = detail.data?.messages ?? [];
    const landed = serverMessages.some(
      (m) =>
        (pendingUser.client_request_id != null &&
          m.client_request_id === pendingUser.client_request_id) ||
        (m.role === 'user' && m.content === pendingUser.content && m.status !== 'failed'),
    );
    if (landed) {
      setPendingUser(null);
    }
  }, [detail.data?.messages, pendingUser]);

  const onSend = async (text: string) => {
    if (!conversationId || waiting) {
      return;
    }
    // Prefer text from the composer press (live ref) over React state — Android IME
    // can leave controlled `draft` one tick behind what the user typed.
    const content = text.trim() || draft.trim();
    if (!content) {
      return;
    }
    const clientRequestId =
      pendingRequestRef.current?.content === content
        ? pendingRequestRef.current.clientRequestId
        : crypto.randomUUID();
    pendingRequestRef.current = { content, clientRequestId };

    const optimistic: AiMessage = {
      id: OPTIMISTIC_USER_ID,
      conversation_id: conversationId,
      role: 'user',
      content,
      status: 'pending',
      model: null,
      prompt_tokens: null,
      completion_tokens: null,
      safety_state: 'ok',
      created_at: new Date().toISOString(),
      client_request_id: clientRequestId,
    };

    // Chat-style: clear the composer and show the user bubble immediately.
    setDraft('');
    setPendingUser(optimistic);
    setWaiting(true);
    trackAiMessageSent();
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });

    const sendStarted = Date.now();
    try {
      const result = await postMessage.mutateAsync({ content, clientRequestId });
      // Keep pendingUser until the cache merge shows the real row (avoids a blank gap
      // if setQueryData races or the detail query was briefly empty).
      trackAiResponseGenerated({
        safetyState: result.assistantMessage.safety_state,
        latencyMs: Date.now() - sendStarted,
      });
      if (
        result.assistantMessage.safety_state === 'emergency' ||
        result.assistantMessage.safety_state === 'refused'
      ) {
        trackAiSafetyEscalation(result.assistantMessage.safety_state);
      }
      pendingRequestRef.current = null;
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    } catch (error) {
      setPendingUser(null);
      setDraft(content);
      const latencyMs = Date.now() - sendStarted;
      const message = error instanceof Error ? error.message : t('messages.aiSendFailedMessage');
      const isTimeout =
        error instanceof HealthDataGatewayError &&
        (error.status === 504 || /timed out|timeout/i.test(message));
      trackAiResponseFailed({
        reason: isTimeout
          ? 'timeout'
          : error instanceof HealthDataGatewayError && error.status
            ? 'http'
            : error instanceof Error && error.name === 'AbortError'
              ? 'timeout'
              : 'network',
        latencyMs,
        status: error instanceof HealthDataGatewayError ? (error.status ?? null) : null,
      });
      void alert(t('messages.aiSendFailedTitle'), message);
    } finally {
      setWaiting(false);
    }
  };

  if (!gatewayConfigured) {
    return (
      <ErrorState
        title={t('messages.aiUnavailableTitle')}
        message={t('messages.aiGatewayMissingMessage')}
      />
    );
  }

  if (bootstrapping || (conversationId && detail.isLoading)) {
    return <LoadingState title={t('messages.aiLoading')} />;
  }

  if (!conversationId || detail.isError || bootstrapError) {
    return (
      <ErrorState
        title={t('messages.aiLoadFailed')}
        message={bootstrapError ?? t('messages.aiUnavailableMessage')}
        actionLabel={t('common.retry')}
        onAction={() => {
          setBootstrapping(true);
          setBootstrapError(null);
          void ensure
            .mutateAsync()
            .then((conv) => {
              setConversationId(conv.id);
            })
            .catch((error) => {
              setBootstrapError(
                error instanceof Error ? error.message : t('messages.aiUnavailableMessage'),
              );
            })
            .finally(() => setBootstrapping(false));
        }}
      />
    );
  }

  const threadBody = (
    <>
      <AppText variant="caption" style={styles.disclaimer}>
        {t('messages.aiDisclaimer')}
      </AppText>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        style={styles.listFlex}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={isIOS ? 'interactive' : 'on-drag'}
        automaticallyAdjustKeyboardInsets={false}
        contentContainerStyle={[styles.list, { paddingBottom: spacing.md }]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <AppText variant="cardTitle" style={styles.emptyTitle}>
              {t('messages.aiEmptyTitle')}
            </AppText>
            <AppText variant="body" style={styles.emptyBody}>
              {t('messages.aiEmptyMessage')}
            </AppText>
          </View>
        }
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            thinkingLabel={t('messages.aiThinking')}
            onFeedback={
              item.role === 'assistant' && item.id !== TYPING_ROW_ID
                ? (rating) => {
                    void feedback.mutateAsync({ messageId: item.id, rating });
                    trackAiResponseFeedback(rating);
                  }
                : undefined
            }
          />
        )}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />
      <MessageComposer
        ref={composerRef}
        value={draft}
        onChangeText={setDraft}
        onSend={(text) => void onSend(text)}
        placeholder={t('messages.aiReplyPlaceholder')}
        sending={waiting}
        sendLabel={t('messages.send')}
        sendingLabel={t('messages.aiThinking')}
        paddingBottom={composerPaddingBottom}
        marginBottom={isIOS ? 0 : lift}
      />
    </>
  );

  return (
    <Screen padded={false} style={styles.flex}>
      {isIOS ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior="padding"
          keyboardVerticalOffset={keyboardVerticalOffset}
        >
          {threadBody}
        </KeyboardAvoidingView>
      ) : (
        threadBody
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  disclaimer: {
    color: palette.textSecondary,
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  listFlex: {
    flex: 1,
  },
  list: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingTop: spacing.sm,
    flexGrow: 1,
  },
  empty: {
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    color: palette.text,
  },
  emptyBody: {
    color: palette.textSecondary,
  },
  bubbleRow: {
    marginBottom: spacing.sm,
    flexDirection: 'row',
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowAssistant: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '88%',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleUser: {
    backgroundColor: palette.primary,
  },
  bubbleAssistant: {
    backgroundColor: palette.primaryLight,
    borderWidth: 1,
    borderColor: primaryAlpha(0.18),
  },
  bubbleEmergency: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  bubbleTextUser: {
    color: '#FFFFFF',
  },
  bubbleTextAssistant: {
    color: palette.text,
  },
  feedbackRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  feedbackBtn: {
    padding: 4,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
