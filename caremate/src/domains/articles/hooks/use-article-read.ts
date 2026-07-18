import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { QUERY_KEYS } from '@/constants/config';
import { articleRepository } from '@/domains/articles/repository';
import { useCurrentUserId } from '@/hooks/use-current-user-id';
import type { ArticleReadStatus } from '@/types';

function useArticleReadQueries(articleId: string | undefined) {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();
  const enabled = Boolean(articleId);

  const statusQuery = useQuery({
    queryKey: [...QUERY_KEYS.articleReads, 'status', userId, articleId],
    queryFn: () => articleRepository.getReadStatus(userId, articleId!),
    enabled,
  });

  const invalidateReads = async (status: ArticleReadStatus | null) => {
    queryClient.setQueryData(
      [...QUERY_KEYS.articleReads, 'status', userId, articleId],
      status,
    );
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.articleReads });
  };

  const markReadingMutation = useMutation({
    mutationFn: () => articleRepository.markReading(userId, articleId!),
    onSuccess: (status) => void invalidateReads(status),
  });

  const markReadMutation = useMutation({
    mutationFn: () => articleRepository.markRead(userId, articleId!),
    onSuccess: (status) => void invalidateReads(status),
  });

  const toggleReadMutation = useMutation({
    mutationFn: () => articleRepository.toggleMarkRead(userId, articleId!),
    onSuccess: (status) => void invalidateReads(status),
  });

  return {
    userId,
    enabled,
    status: (statusQuery.data ?? null) as ArticleReadStatus | null,
    isLoading: statusQuery.isLoading,
    isBusy:
      markReadingMutation.isPending ||
      markReadMutation.isPending ||
      toggleReadMutation.isPending,
    markReadingMutation,
    markReadMutation,
    toggleReadMutation,
  };
}

/** Status + mark/toggle — safe for feed cards (does not auto-mark reading). */
export function useArticleReadStatus(articleId: string | undefined) {
  const {
    enabled,
    status,
    isLoading,
    isBusy,
    markReadMutation,
    toggleReadMutation,
  } = useArticleReadQueries(articleId);

  return {
    status,
    isReading: status === 'reading',
    isRead: status === 'read',
    isLoading,
    isBusy,
    markRead: () => {
      if (!enabled || markReadMutation.isPending) return;
      markReadMutation.mutate();
    },
    toggleRead: () => {
      if (!enabled || toggleReadMutation.isPending) return;
      toggleReadMutation.mutate();
    },
  };
}

/**
 * Article detail: auto-marks `reading` on open (unless already `read`),
 * plus mark-read / toggle helpers. Call `markRead` when the user finishes
 * (button or scroll near end).
 */
export function useArticleReadTracking(articleId: string | undefined) {
  const {
    enabled,
    status,
    isLoading,
    isBusy,
    markReadingMutation,
    markReadMutation,
    toggleReadMutation,
  } = useArticleReadQueries(articleId);
  const markedReadingRef = useRef<string | null>(null);

  useEffect(() => {
    if (!articleId || !enabled) return;
    if (markedReadingRef.current === articleId) return;
    markedReadingRef.current = articleId;
    markReadingMutation.mutate();
    // Once per article open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId, enabled]);

  return {
    status,
    isReading: status === 'reading',
    isRead: status === 'read',
    isLoading,
    isBusy,
    markRead: () => {
      if (!enabled || markReadMutation.isPending) return;
      markReadMutation.mutate();
    },
    toggleRead: () => {
      if (!enabled || toggleReadMutation.isPending) return;
      toggleReadMutation.mutate();
    },
  };
}
