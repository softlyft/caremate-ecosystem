import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/constants/config';
import {
  createAiConversation,
  ensureAiConversation,
  getAiConversation,
  listAiConversations,
  postAiMessage,
  submitAiFeedback,
} from '@/domains/ai/repository';

export function useAiConversations() {
  return useQuery({
    queryKey: QUERY_KEYS.aiConversations,
    queryFn: listAiConversations,
  });
}

export function useAiConversation(conversationId: string | undefined) {
  return useQuery({
    queryKey: [...QUERY_KEYS.aiConversation, conversationId],
    queryFn: () => getAiConversation(conversationId!),
    enabled: Boolean(conversationId),
  });
}

export function useEnsureAiConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ensureAiConversation,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.aiConversations });
    },
  });
}

export function useCreateAiConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => createAiConversation(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.aiConversations });
    },
  });
}

export function usePostAiMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { content: string; clientRequestId: string }) =>
      postAiMessage(conversationId, input.content, input.clientRequestId),
    onSuccess: (result) => {
      queryClient.setQueryData(
        [...QUERY_KEYS.aiConversation, conversationId],
        (current: Awaited<ReturnType<typeof getAiConversation>> | undefined) => {
          const priorMessages = current?.messages ?? [];
          const withoutDupes = priorMessages.filter(
            (m) => m.id !== result.userMessage.id && m.id !== result.assistantMessage.id,
          );
          const messages = [...withoutDupes, result.userMessage, result.assistantMessage];
          if (!current) {
            // Cache may be empty if the detail query hadn't settled; still surface the turn.
            return {
              conversation: {
                id: conversationId,
                user_id: '',
                title: 'CareMate AI',
                status: 'active',
                retention_state: 'active',
                created_at: result.userMessage.created_at,
                updated_at: result.assistantMessage.created_at,
              },
              messages,
            };
          }
          return {
            ...current,
            conversation: {
              ...current.conversation,
              updated_at: result.assistantMessage.created_at,
            },
            messages,
          };
        },
      );
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.aiConversations });
    },
  });
}

export function useAiFeedback() {
  return useMutation({
    mutationFn: (input: { messageId: string; rating: 'up' | 'down' }) =>
      submitAiFeedback(input.messageId, input.rating),
  });
}
