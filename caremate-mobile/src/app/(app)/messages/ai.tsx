import { useNavigation } from 'expo-router';
import { Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react-native';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
import { useTranslation } from '@/domains/localization';
import { isHealthDataGatewayConfigured } from '@/domains/health-data-gateway/client';
import {
  trackAiChatOpened,
  trackAiConversationStarted,
  trackAiMessageSent,
  trackAiResponseFeedback,
  trackAiResponseGenerated,
  trackAiSafetyEscalation,
} from '@/lib/monitoring/product-analytics';
import { layoutSpacing, palette, primaryAlpha, radius, spacing } from '@/theme';

const STACK_HEADER_HEIGHT = 64;
const KEYBOARD_CLEARANCE = spacing.sm;

function MessageBubble({
  message,
  onFeedback,
}: {
  message: AiMessage;
  onFeedback?: (rating: 'up' | 'down') => void;
}) {
  const isUser = message.role === 'user';
  const showFeedback = !isUser && message.role === 'assistant' && onFeedback;

  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
          message.safety_state === 'emergency' ? styles.bubbleEmergency : null,
        ]}
      >
        <AppText
          variant="body"
          style={isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant}
        >
          {message.content}
        </AppText>
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
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [bootstrapping, setBootstrapping] = useState(true);
  const [waiting, setWaiting] = useState(false);
  const [draft, setDraft] = useState('');
  const ensure = useEnsureAiConversation();
  const detail = useAiConversation(conversationId);
  const postMessage = usePostAiMessage(conversationId ?? '');
  const feedback = useAiFeedback();
  const startedRef = useRef(false);
  /** Reuse idempotency key when retrying the same draft after a failed send. */
  const pendingRequestRef = useRef<{ content: string; clientRequestId: string } | null>(
    null,
  );

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
    if (!isHealthDataGatewayConfigured()) {
      setBootstrapping(false);
      return;
    }
    void (async () => {
      try {
        const conv = await ensure.mutateAsync();
        setConversationId(conv.id);
        if (!startedRef.current) {
          startedRef.current = true;
          trackAiConversationStarted();
        }
      } catch {
        // Error UI below
      } finally {
        setBootstrapping(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap once
  }, []);

  const messages = detail.data?.messages ?? [];

  const onSend = async () => {
    if (!conversationId || waiting) {
      return;
    }
    const content = draft.trim();
    if (!content) {
      return;
    }
    setWaiting(true);
    trackAiMessageSent();
    const clientRequestId =
      pendingRequestRef.current?.content === content
        ? pendingRequestRef.current.clientRequestId
        : crypto.randomUUID();
    pendingRequestRef.current = { content, clientRequestId };
    try {
      const result = await postMessage.mutateAsync({ content, clientRequestId });
      trackAiResponseGenerated({ safetyState: result.assistantMessage.safety_state });
      if (
        result.assistantMessage.safety_state === 'emergency' ||
        result.assistantMessage.safety_state === 'refused'
      ) {
        trackAiSafetyEscalation(result.assistantMessage.safety_state);
      }
      pendingRequestRef.current = null;
      setDraft('');
    } catch (error) {
      void alert(
        t('messages.aiSendFailedTitle'),
        error instanceof Error ? error.message : t('messages.aiSendFailedMessage'),
      );
    } finally {
      setWaiting(false);
    }
  };

  if (!isHealthDataGatewayConfigured()) {
    return (
      <ErrorState
        title={t('messages.aiUnavailableTitle')}
        message={t('messages.aiUnavailableMessage')}
      />
    );
  }

  if (bootstrapping || (conversationId && detail.isLoading)) {
    return <LoadingState title={t('messages.aiLoading')} />;
  }

  if (!conversationId || detail.isError) {
    return (
      <ErrorState
        title={t('messages.aiLoadFailed')}
        message={t('common.loadFailedMessage')}
        actionLabel={t('common.retry')}
        onAction={() => {
          setBootstrapping(true);
          void ensure
            .mutateAsync()
            .then((conv) => {
              setConversationId(conv.id);
            })
            .finally(() => setBootstrapping(false));
        }}
      />
    );
  }

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={STACK_HEADER_HEIGHT + KEYBOARD_CLEARANCE}
      >
        <AppText variant="caption" style={styles.disclaimer}>
          {t('messages.aiDisclaimer')}
        </AppText>
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + spacing.md },
          ]}
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
              onFeedback={
                item.role === 'assistant'
                  ? (rating) => {
                      void feedback.mutateAsync({ messageId: item.id, rating });
                      trackAiResponseFeedback(rating);
                    }
                  : undefined
              }
            />
          )}
        />
        {waiting ? (
          <View style={styles.waiting}>
            <ActivityIndicator color={palette.primary} />
            <AppText variant="caption" style={styles.waitingText}>
              {t('messages.aiThinking')}
            </AppText>
          </View>
        ) : null}
        <MessageComposer
          ref={composerRef}
          value={draft}
          onChangeText={setDraft}
          onSend={() => void onSend()}
          placeholder={t('messages.aiReplyPlaceholder')}
          sending={waiting}
          sendLabel={t('messages.send')}
          sendingLabel={t('messages.aiThinking')}
          paddingBottom={insets.bottom + spacing.sm}
        />
      </KeyboardAvoidingView>
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
  waiting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingBottom: spacing.xs,
  },
  waitingText: {
    color: palette.textSecondary,
  },
});
