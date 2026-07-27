import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import {
  parseArticleIdFromShareUrl,
  stashPendingArticleShareId,
} from '@/domains/articles/share';
import { useAuthStore } from '@/features/auth/store';

async function openArticleFromUrl(url: string, deferIfCold: boolean): Promise<void> {
  const articleId = parseArticleIdFromShareUrl(url);
  if (!articleId) {
    return;
  }

  const auth = useAuthStore.getState();
  // App shell may not be ready yet (splash / onboarding) — stash and resume from (app).
  if (deferIfCold && (!auth.isInitialized || auth.passwordRecoveryPending)) {
    await stashPendingArticleShareId(articleId);
    return;
  }

  router.push(`/(app)/articles/${articleId}`);
}

/** Opens CareMate article share links: caremate://articles/<id> or https://…/articles/<id>. */
export function ArticleShareDeepLinkHandler() {
  const handledInitial = useRef(false);

  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      void openArticleFromUrl(url, false);
    });

    if (!handledInitial.current) {
      handledInitial.current = true;
      void Linking.getInitialURL().then((url) => {
        if (url) {
          return openArticleFromUrl(url, true);
        }
      });
    }

    return () => sub.remove();
  }, []);

  return null;
}
