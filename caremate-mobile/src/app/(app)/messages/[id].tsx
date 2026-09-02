import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddCareCoordinationButton } from '@/components/messaging/AddCareCoordinationButton';
import { glossyStackHeaderOptions } from '@/components/navigation/glossyStackHeader';
import { MessageComposer, type MessageComposerHandle } from '@/components/ui/form-controls';

import { AppText } from '@/components/ui/AppText';
import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { useTranslation } from '@/domains/localization';
import { useConversationMessages } from '@/domains/messaging/hooks';
import {
  conversationHeaderTitle,
  isGroupConversation,
  type ThreadMessage,
} from '@/domains/messaging/sender-display';
import {
  markConversationRead,
  patientMessageErrorKey,
  sendPatientReply,
} from '@/domains/messaging/repository';
import { useCurrentUserId } from '@/hooks/use-current-user-id';
import { layoutSpacing, palette, radius, spacing } from '@/theme';

/** Native stack header height; used for KeyboardAvoidingView offset on iOS. */
const STACK_HEADER_HEIGHT = 56;

type ThreadItem =
  | { kind: 'day'; id: string; label: string }
  | { kind: 'message'; id: string; message: ThreadMessage };

function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function localDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function formatDayLabel(iso: string, todayLabel: string, yesterdayLabel: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const now = new Date();
  if (sameLocalDay(date, now)) {
    return todayLabel;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameLocalDay(date, yesterday)) {
    return yesterdayLabel;
  }

  const options: Intl.DateTimeFormatOptions =
    date.getFullYear() === now.getFullYear()
      ? { weekday: 'short', month: 'short', day: 'numeric' }
      : { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };

  return date.toLocaleDateString(undefined, options);
}

function buildThreadItems(
  messages: ThreadMessage[],
  todayLabel: string,
  yesterdayLabel: string,
): ThreadItem[] {
  const items: ThreadItem[] = [];
  let lastDayKey: string | null = null;

  for (const message of messages) {
    const createdAt = new Date(message.created_at);
    if (!Number.isNaN(createdAt.getTime())) {
      const dayKey = localDayKey(createdAt);
      if (dayKey !== lastDayKey) {
        const label = formatDayLabel(message.created_at, todayLabel, yesterdayLabel);
        if (label) {
          items.push({ kind: 'day', id: `day-${dayKey}`, label });
          lastDayKey = dayKey;
        }
      }
    }

    items.push({ kind: 'message', id: message.id, message });
  }

  return items;
}

function DaySeparator({ label }: { label: string }) {
  return (
    <View style={styles.daySeparator} accessibilityRole="header">
      <View style={styles.daySeparatorLine} />
      <AppText variant="caption" style={styles.daySeparatorLabel}>
        {label}
      </AppText>
      <View style={styles.daySeparatorLine} />
    </View>
  );
}

function MessageRow({
  message,
  mine,
  showSender,
}: {
  message: ThreadMessage;
  mine: boolean;
  showSender: boolean;
}) {
  const timeLabel = formatMessageTime(message.created_at);
  const sender = message.senderDisplay;

  return (
    <View style={[styles.messageRow, mine ? styles.messageRowMine : styles.messageRowTheirs]}>
      {showSender && sender && !mine ? (
        <View style={styles.senderMeta}>
          <AppText variant="caption" style={styles.senderName}>
            {sender.name}
          </AppText>
          {sender.roleLabel ? (
            <AppText variant="caption" style={styles.senderRole}>
              ({sender.roleLabel})
            </AppText>
          ) : null}
        </View>
      ) : null}
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        {!showSender && message.subject ? (
          <AppText variant="caption" style={styles.bubbleSubject}>
            {message.subject}
          </AppText>
        ) : null}
        <AppText variant="body" style={mine ? styles.bubbleTextMine : styles.bubbleTextTheirs}>
          {message.body}
        </AppText>
        {timeLabel ? (
          <AppText
            variant="caption"
            style={[styles.bubbleTime, mine ? styles.bubbleTimeMine : styles.bubbleTimeTheirs]}
          >
            {timeLabel}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Lift the composer by whatever keyboard height the layout hasn't already absorbed.
 * Android edge-to-edge can partially resize the window — subtracting only the remainder
 * avoids both under-lift (covered input) and double-lift.
 */
function useKeyboardLift() {
  const insets = useSafeAreaInsets();
  const baselineHeightRef = useRef(Dimensions.get('window').height);
  const keyboardHeightRef = useRef(0);

  const [lift, setLift] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const recompute = (keyboardHeight: number) => {
      keyboardHeightRef.current = keyboardHeight;
      const windowHeight = Dimensions.get('window').height;
      const open = keyboardHeight > 0;

      if (!open) {
        baselineHeightRef.current = windowHeight;
        setKeyboardOpen(false);
        setLift(0);
        return;
      }

      setKeyboardOpen(true);

      if (Platform.OS === 'ios') {
        // iOS uses KeyboardAvoidingView; keep lift at 0 to avoid double-adjustment.
        setLift(0);
        return;
      }

      // Android: only lift the portion not already taken by window resize / insets.
      const shrunkBy = Math.max(0, baselineHeightRef.current - windowHeight);
      const remaining = Math.max(0, keyboardHeight - shrunkBy);
      setLift(remaining);
    };

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      recompute(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      recompute(0);
    });
    const dimSub = Dimensions.addEventListener('change', () => {
      recompute(keyboardHeightRef.current);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
      dimSub.remove();
    };
  }, [insets.bottom]);

  const composerPaddingBottom = keyboardOpen ? spacing.sm : Math.max(insets.bottom, spacing.sm);

  return { lift, composerPaddingBottom, keyboardOpen };
}

export default function MessageThreadScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList<ThreadItem>>(null);
  const composerRef = useRef<MessageComposerHandle>(null);
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const conversationId = Array.isArray(rawId) ? rawId[0] : rawId;
  const threadQuery = useConversationMessages(conversationId ?? '');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const threadConversation = threadQuery.data?.conversation ?? null;
  const isGroupChat = isGroupConversation(threadConversation);
  const { lift, composerPaddingBottom, keyboardOpen } = useKeyboardLift();
  const isIOS = Platform.OS === 'ios';
  const keyboardVerticalOffset = isIOS ? insets.top + STACK_HEADER_HEIGHT : 0;
  const todayLabel = t('messages.today');
  const yesterdayLabel = t('messages.yesterday');

  const headerTitle = conversationHeaderTitle(threadConversation, {
    directFallback: t('messages.directBadge'),
    coordinationFallback: t('messages.coordinationBadge'),
    providerFallback: t('messages.providerFallback'),
    insurerFallback: t('messages.insurerFallback'),
    threadFallback: t('messages.threadTitle'),
  });

  useLayoutEffect(() => {
    navigation.setOptions(
      glossyStackHeaderOptions({
        title: headerTitle,
        accent: palette.primary,
        soft: palette.primaryLight,
        softEnd: '#F0FDFA',
        titleColor: palette.primaryDark,
        icon: MessageCircle,
        backAccessibilityLabel: t('nav.backToMessages'),
      }),
    );
  }, [navigation, headerTitle, t]);

  useEffect(() => {
    if (!conversationId || !threadConversation) return;
    let active = true;
    void (async () => {
      try {
        await markConversationRead(conversationId, userId);
        if (active) {
          await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.messages });
        }
      } catch {
        // best-effort
      }
    })();
    return () => {
      active = false;
    };
  }, [conversationId, threadConversation, userId, queryClient]);

  const messages = useMemo(() => threadQuery.data?.messages ?? [], [threadQuery.data?.messages]);
  const threadItems = useMemo(
    () => buildThreadItems(messages, todayLabel, yesterdayLabel),
    [messages, todayLabel, yesterdayLabel],
  );

  useEffect(() => {
    if (messages.length === 0) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 50);
    return () => clearTimeout(timer);
  }, [messages.length]);

  useEffect(() => {
    if (!keyboardOpen) return;
    const timer = setTimeout(
      () => {
        listRef.current?.scrollToEnd({ animated: true });
      },
      Platform.OS === 'ios' ? 80 : 120,
    );
    return () => clearTimeout(timer);
  }, [keyboardOpen]);

  async function handleSend() {
    const body = draft.trim();
    if (!body || !conversationId || sending) return;
    setSending(true);
    try {
      await sendPatientReply(conversationId, body);
      setDraft('');
      await threadQuery.refetch();
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.messages });
    } catch (error) {
      Alert.alert(t('messages.sendFailedTitle'), t(patientMessageErrorKey(error)));
    } finally {
      setSending(false);
      composerRef.current?.focus();
    }
  }

  if (!conversationId) {
    return <EmptyState title={t('messages.missingThread')} />;
  }

  if (threadQuery.isLoading) {
    return <LoadingState title={t('messages.loading')} />;
  }

  if (threadQuery.isError) {
    return (
      <ErrorState
        title={t('messages.loadFailed')}
        message={t('common.loadFailedMessage')}
        actionLabel={t('common.retry')}
        onAction={() => void threadQuery.refetch()}
      />
    );
  }

  const threadBody = (
    <>
      {threadConversation?.kind === 'org_patient' ? (
        <View style={styles.headerActions}>
          <AddCareCoordinationButton conversation={threadConversation} />
        </View>
      ) : null}
      <FlatList
        ref={listRef}
        data={threadItems}
        keyExtractor={(item) => item.id}
        style={styles.listFlex}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={isIOS ? 'interactive' : 'on-drag'}
        automaticallyAdjustKeyboardInsets={!isIOS}
        contentContainerStyle={[
          styles.list,
          messages.length === 0 ? styles.listEmpty : null,
          { paddingBottom: spacing.md },
        ]}
        ListEmptyComponent={
          <EmptyState
            title={t('messages.threadEmptyTitle')}
            message={t('messages.threadEmptyMessage')}
          />
        }
        renderItem={({ item }) =>
          item.kind === 'day' ? (
            <DaySeparator label={item.label} />
          ) : (
            <MessageRow
              message={item.message}
              mine={
                item.message.sender_party_type === 'user' && item.message.sender_user_id === userId
              }
              showSender={isGroupChat}
            />
          )
        }
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />
      <MessageComposer
        ref={composerRef}
        value={draft}
        onChangeText={setDraft}
        onSend={() => void handleSend()}
        placeholder={t('messages.replyPlaceholder')}
        sending={sending}
        sendLabel={t('messages.send')}
        sendingLabel={t('messages.sending')}
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
  flex: {
    flex: 1,
  },
  headerActions: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  messageRow: {
    marginVertical: 4,
    maxWidth: '88%',
  },
  messageRowMine: {
    alignSelf: 'flex-end',
  },
  messageRowTheirs: {
    alignSelf: 'flex-start',
  },
  senderMeta: {
    marginBottom: 4,
    gap: 2,
  },
  senderName: {
    color: palette.text,
    fontWeight: '600',
  },
  senderRole: {
    color: palette.textSecondary,
    textTransform: 'lowercase',
  },
  listFlex: {
    flex: 1,
  },
  list: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    gap: spacing.sm,
  },
  listEmpty: {
    flexGrow: 1,
  },
  daySeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  daySeparatorLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.divider,
  },
  daySeparatorLabel: {
    color: palette.textSecondary,
    fontWeight: '600',
    paddingHorizontal: spacing.xs,
  },
  bubble: {
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMine: {
    backgroundColor: palette.primary,
  },
  bubbleTheirs: {
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.divider,
  },
  bubbleSubject: {
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    opacity: 0.85,
  },
  bubbleTextMine: {
    color: '#fff',
  },
  bubbleTextTheirs: {
    color: palette.text,
  },
  bubbleTime: {
    marginTop: 6,
    fontSize: 11,
    alignSelf: 'flex-end',
  },
  bubbleTimeMine: {
    color: 'rgba(255,255,255,0.78)',
  },
  bubbleTimeTheirs: {
    color: palette.textSecondary,
  },
});
