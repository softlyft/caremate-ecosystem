import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, type PlatformOSType } from 'react-native';

import { buildHttpsAppLink, isAllowedAppLinkHostname } from '@/lib/app-links';
import type { Article } from '@/types';

const PENDING_ARTICLE_SHARE_KEY = 'caremate_pending_article_share_id';

/** In-app / website path segment for article detail links. */
export const ARTICLE_SHARE_PATH_PREFIX = 'articles';

/**
 * Public website URL for an article (`https://…/articles/<id>`).
 * Always HTTPS so chat apps and browsers treat it as a real link; the website
 * redirects `/articles/<id>` to the canonical category/slug page.
 * (Custom `caremate://` schemes stay supported for inbound deep links only.)
 */
export function buildArticleShareUrl(articleId: string): string {
  const id = articleId.trim();
  const path = `${ARTICLE_SHARE_PATH_PREFIX}/${encodeURIComponent(id)}`;
  return buildHttpsAppLink(path);
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
 * Extract an article id from a CareMate deep link / website share URL.
 * Supports `caremate://articles/<id>` and `https://…/articles/<id>`.
 * Canonical website paths `/articles/<category>/<slug>` return null (open in browser).
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
      if (articlesIndex < 0 || !parts[articlesIndex + 1]) {
        return null;
      }
      // Canonical website path `/articles/:category/:slug` — not an app article id.
      if (parts[articlesIndex + 2]) {
        return null;
      }
      return decodeArticleId(parts[articlesIndex + 1]);
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
    const articlesAt = trimmed.toLowerCase().indexOf('articles/');
    const after = articlesAt >= 0 ? trimmed.slice(articlesAt + 'articles/'.length) : pathMatch[1];
    if (after.includes('/')) {
      return null;
    }
    return decodeArticleId(pathMatch[1]);
  }

  return null;
}

export type ArticleShareContent = {
  title: string;
  message: string;
  /** iOS share URL (public website link). Android embeds the link in `message`. */
  url?: string;
};

/** Build native share payload: copy + public website link (+ cover image URL when present). */
export function buildArticleShareContent(
  article: Pick<Article, 'id' | 'title' | 'summary' | 'imageUrl'>,
  labels?: { continueReading?: string },
  platform: PlatformOSType = Platform.OS,
): ArticleShareContent {
  const shareUrl = buildArticleShareUrl(article.id);
  const title = article.title.trim() || 'CareMate article';
  const summary = article.summary?.trim() ?? '';
  const imageUrl = article.imageUrl?.trim() ?? '';
  const continueReading = labels?.continueReading?.trim() || 'Read the full article:';

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

  // Android ignores Share `url` — keep the website link inside the message body.
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
