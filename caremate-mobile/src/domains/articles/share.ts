import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, type PlatformOSType } from 'react-native';

import {
  buildHttpsAppLink,
  isAllowedAppLinkHostname,
  shouldPreferHttpsAppLinks,
} from '@/lib/app-links';
import type { Article } from '@/types';

const PENDING_ARTICLE_SHARE_KEY = 'caremate_pending_article_share_id';

/** In-app path segment for article detail deep links. */
export const ARTICLE_SHARE_PATH_PREFIX = 'articles';

/**
 * Deep link that opens CareMate on the article detail screen.
 * Prefers https Universal/App Links when the website host is configured.
 */
export function buildArticleShareUrl(articleId: string): string {
  const id = articleId.trim();
  const path = `${ARTICLE_SHARE_PATH_PREFIX}/${encodeURIComponent(id)}`;
  if (shouldPreferHttpsAppLinks()) {
    return buildHttpsAppLink(path);
  }
  return `caremate://${path}`;
}

function decodeArticleId(raw: string): string | null {
  try {
    const id = decodeURIComponent(raw).trim();
    return id.length > 0 ? id : null;
  } catch {
    const id = raw.trim();
    return id.length > 0 ? id : null;
  }
}

/**
 * Extract an article id from a CareMate deep link / Universal Link.
 */
export function parseArticleIdFromShareUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      if (!isAllowedAppLinkHostname(url.hostname)) {
        return null;
      }
      const parts = url.pathname.split('/').filter(Boolean);
      const articlesIndex = parts.findIndex((part) => part.toLowerCase() === 'articles');
      if (articlesIndex >= 0 && parts[articlesIndex + 1]) {
        return decodeArticleId(parts[articlesIndex + 1]);
      }
      return null;
    }

    if (url.protocol === 'caremate:') {
      const parts = `${url.host}${url.pathname}`.split('/').filter(Boolean);
      const articlesIndex = parts.findIndex((part) => part.toLowerCase() === 'articles');
      if (articlesIndex >= 0 && parts[articlesIndex + 1]) {
        return decodeArticleId(parts[articlesIndex + 1]);
      }
    }
  } catch {
    // Fall through to path regex for odd deep-link forms.
  }

  const pathMatch = trimmed.match(/(?:caremate:\/\/|\/)articles\/([^/?#]+)/i);
  if (pathMatch?.[1]) {
    return decodeArticleId(pathMatch[1]);
  }

  return null;
}

export type ArticleShareContent = {
  title: string;
  message: string;
  /** iOS share URL (deep link). Android embeds the link in `message`. */
  url?: string;
};

/** Build native share payload: copy + deep link (+ cover image URL when present). */
export function buildArticleShareContent(
  article: Pick<Article, 'id' | 'title' | 'summary' | 'imageUrl'>,
  labels?: { continueReading?: string },
  platform: PlatformOSType = Platform.OS,
): ArticleShareContent {
  const shareUrl = buildArticleShareUrl(article.id);
  const title = article.title.trim() || 'CareMate article';
  const summary = article.summary?.trim() ?? '';
  const imageUrl = article.imageUrl?.trim() ?? '';
  const continueReading = labels?.continueReading?.trim() || 'Continue reading in CareMate:';

  const blocks: string[] = [title];
  if (summary) {
    blocks.push(summary);
  }
  blocks.push(`${continueReading}\n${shareUrl}`);
  if (imageUrl) {
    blocks.push(imageUrl);
  }

  const message = blocks.join('\n\n');

  if (platform === 'ios') {
    return { title, message, url: shareUrl };
  }

  // Android ignores Share `url` — keep the deep link inside the message body.
  return { title, message };
}

export async function stashPendingArticleShareId(articleId: string): Promise<void> {
  const id = articleId.trim();
  if (!id) return;
  await AsyncStorage.setItem(PENDING_ARTICLE_SHARE_KEY, id);
}

export async function takePendingArticleShareId(): Promise<string | null> {
  const value = await AsyncStorage.getItem(PENDING_ARTICLE_SHARE_KEY);
  if (!value) return null;
  await AsyncStorage.removeItem(PENDING_ARTICLE_SHARE_KEY);
  return value.trim() || null;
}
