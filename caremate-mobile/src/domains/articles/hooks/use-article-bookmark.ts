import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/constants/config';
import { articleRepository } from '@/domains/articles/repository';
import { useCurrentUserId } from '@/hooks/use-current-user-id';

export function useArticleBookmark(articleId: string | undefined) {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();
  const enabled = Boolean(articleId);

  const bookmarkedQuery = useQuery({
    queryKey: [...QUERY_KEYS.bookmarks, 'status', userId, articleId],
    queryFn: () => articleRepository.isBookmarked(userId, articleId!),
    enabled,
  });

  const toggleMutation = useMutation({
    mutationFn: () => articleRepository.toggleBookmark(userId, articleId!),
    onSuccess: async (isBookmarked) => {
      queryClient.setQueryData(
        [...QUERY_KEYS.bookmarks, 'status', userId, articleId],
        isBookmarked,
      );
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bookmarks });
    },
  });

  return {
    isBookmarked: bookmarkedQuery.data ?? false,
    isLoading: bookmarkedQuery.isLoading,
    isToggling: toggleMutation.isPending,
    toggle: () => {
      if (!articleId || toggleMutation.isPending) {
        return;
      }
      toggleMutation.mutate();
    },
  };
}
