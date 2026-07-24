import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import { layoutSpacing, palette, radius, spacing } from '@/theme';

function Bubble({ message, mine }: { message: MessageMessage; mine: boolean }) {
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
    </View>
  );
}

export default function MessageThreadScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList<MessageMessage>>(null);
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const conversationId = Array.isArray(rawId) ? rawId[0] : rawId;
  const messagesQuery = useConversationMessages(conversationId ?? '');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState(t('messages.threadTitle'));

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
        await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.messagesUnread });
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

  useEffect(() => {
    if (messages.length === 0) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 50);
    return () => clearTimeout(timer);
  }, [messages.length]);

  async function handleSend() {
    const body = draft.trim();
    if (!body || !conversationId || sending) return;
    setSending(true);
    try {
      await sendPatientReply(conversationId, body);
      setDraft('');
      await messagesQuery.refetch();
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.messages });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.messagesUnread });
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
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <View style={styles.headerHint}>
        <AppText variant="caption" color="brand">
          {title}
        </AppText>
      </View>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
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
        renderItem={({ item }) => (
          <Bubble
            message={item}
            mine={item.sender_party_type === 'user' && item.sender_user_id === userId}
          />
        )}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />
      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={t('messages.replyPlaceholder')}
          placeholderTextColor="#9CA3AF"
          multiline
          editable={!sending}
        />
        <Pressable
          style={[styles.sendButton, (!draft.trim() || sending) && styles.sendDisabled]}
          onPress={() => void handleSend()}
          disabled={!draft.trim() || sending}
        >
          <AppText variant="seeAll" style={styles.sendLabel}>
            {sending ? t('messages.sending') : t('messages.send')}
          </AppText>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
  list: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    gap: spacing.sm,
  },
  listEmpty: {
    flexGrow: 1,
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
