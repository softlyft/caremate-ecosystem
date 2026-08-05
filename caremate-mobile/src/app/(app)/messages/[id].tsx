import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Keyboard,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/form-controls';

import { AppText } from '@/components/ui/AppText';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { useTranslation } from '@/domains/localization';
import { useConversationMessages } from '@/domains/messaging/hooks';
import {
  getConversation,
  markConversationRead,
  sendPatientReply,
  type MessageMessage,
} from '@/domains/messaging/repository';
import { useCurrentUserId } from '@/hooks/use-current-user-id';
import { layoutSpacing, palette, radius, spacing, textColors } from '@/theme';

type ThreadItem =
  | { kind: 'day'; id: string; label: string }
  | { kind: 'message'; id: string; message: MessageMessage };

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
  messages: MessageMessage[],
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

function Bubble({ message, mine }: { message: MessageMessage; mine: boolean }) {
  const timeLabel = formatMessageTime(message.created_at);
  return (
    <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
      {message.subject ? (
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
    const bottomInset = insets.bottom;

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
        setLift(Math.max(keyboardHeight - bottomInset, 0));
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
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList<ThreadItem>>(null);
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const conversationId = Array.isArray(rawId) ? rawId[0] : rawId;
  const messagesQuery = useConversationMessages(conversationId ?? '');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState(t('messages.threadTitle'));
  const { lift, composerPaddingBottom, keyboardOpen } = useKeyboardLift();
  const todayLabel = t('messages.today');
  const yesterdayLabel = t('messages.yesterday');

  useEffect(() => {
    if (!conversationId) return;
    let active = true;
    void (async () => {
      try {
        const conversation = await getConversation(conversationId, userId);
        if (active && conversation) {
          setTitle(
            conversation.title ?? conversation.organization_name ?? t('messages.threadTitle'),
          );
        }
        await markConversationRead(conversationId, userId);
        await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.messages });
      } catch {
        // best-effort
      }
    })();
    return () => {
      active = false;
    };
  }, [conversationId, userId, queryClient, t]);

  const messages = useMemo(() => messagesQuery.data ?? [], [messagesQuery.data]);
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
  }, [keyboardOpen, lift]);

  async function handleSend() {
    const body = draft.trim();
    if (!body || !conversationId || sending) return;
    setSending(true);
    try {
      await sendPatientReply(conversationId, body);
      setDraft('');
      await messagesQuery.refetch();
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.messages });
    } catch (error) {
      Alert.alert(
        t('messages.sendFailedTitle'),
        error instanceof Error ? error.message : t('messages.sendFailedMessage'),
      );
    } finally {
      setSending(false);
    }
  }

  if (!conversationId) {
    return <EmptyState title={t('messages.missingThread')} />;
  }

  if (messagesQuery.isLoading) {
    return <LoadingState title={t('messages.loading')} />;
  }

  if (messagesQuery.isError) {
    return (
      <ErrorState
        title={t('messages.loadFailed')}
        message={t('common.loadFailedMessage')}
        actionLabel={t('common.retry')}
        onAction={() => void messagesQuery.refetch()}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.headerHint}>
        <AppText variant="caption" color="brand">
          {title}
        </AppText>
      </View>
      <FlatList
        ref={listRef}
        data={threadItems}
        keyExtractor={(item) => item.id}
        style={styles.listFlex}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
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
            <Bubble
              message={item.message}
              mine={
                item.message.sender_party_type === 'user' && item.message.sender_user_id === userId
              }
            />
          )
        }
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />
      <View
        style={[
          styles.composer,
          {
            paddingBottom: composerPaddingBottom,
            marginBottom: lift,
          },
        ]}
      >
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={t('messages.replyPlaceholder')}
          placeholderTextColor={textColors.placeholder}
          multiline
          editable={!sending}
          textAlignVertical="top"
        />
        <Button
          style={[styles.sendButton, (!draft.trim() || sending) && styles.sendDisabled]}
          onPress={() => void handleSend()}
          disabled={!draft.trim() || sending}
          variant="plain"
        >
          <AppText variant="seeAll" style={styles.sendLabel}>
            {sending ? t('messages.sending') : t('messages.send')}
          </AppText>
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  headerHint: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingVertical: spacing.sm,
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
    maxWidth: '82%',
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginVertical: 4,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: palette.primary,
  },
  bubbleTheirs: {
    alignSelf: 'flex-start',
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
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: palette.divider,
    backgroundColor: palette.background,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.divider,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: palette.text,
    backgroundColor: palette.surface,
  },
  sendButton: {
    borderRadius: radius.full,
    backgroundColor: palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sendDisabled: {
    opacity: 0.45,
  },
  sendLabel: {
    color: '#fff',
  },
});
