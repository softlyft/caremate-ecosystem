/**
 * Server-side Currents API client for SoftLyft admin external-news sync.
 * API key must never ship to the mobile app.
 */

export type CurrentsNewsItem = {
  id: string;
  title: string;
  description: string;
  url: string;
  author: string;
  image: string;
  language: string;
  category: string[];
  published: string;
};

type CurrentsSearchResponse = {
  status: string;
  news?: CurrentsNewsItem[];
};

const CURRENTS_BASE_URL = 'https://api.currentsapi.services/v1';
export const INTERNATIONAL_NEWS_REGION = 'INT';

function getApiKey(): string {
  return process.env.CURRENTS_API_KEY?.trim() ?? '';
}

export function isCurrentsConfigured(): boolean {
  return Boolean(getApiKey());
}

function normalizeImageUrl(image: string | null | undefined): string | null {
  if (!image || image === 'None') {
    return null;
  }
  if (image.startsWith('//')) {
    return `https:${image}`;
  }
  return image;
}

function normalizeNews(items: CurrentsNewsItem[], limit: number): CurrentsNewsItem[] {
  return items.slice(0, limit).map((item) => ({
    ...item,
    image: normalizeImageUrl(item.image) ?? '',
  }));
}

/**
 * Fetch latest health news for a region.
 * For INT, omit the country query param (Currents often returns empty for country=INT).
 */
export async function fetchHealthNews(
  regionCode: string,
  limit = 15,
  languageCode: 'en' | 'fr' | 'es' = 'en',
): Promise<CurrentsNewsItem[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('CURRENTS_API_KEY is not configured on the admin portal');
  }

  const params = new URLSearchParams({
    category: 'health',
    language: languageCode,
  });

  const normalized = regionCode.trim().toUpperCase();
  if (normalized && normalized !== INTERNATIONAL_NEWS_REGION) {
    params.set('country', normalized);
  }

  const response = await fetch(`${CURRENTS_BASE_URL}/search?${params.toString()}`, {
    headers: {
      Authorization: apiKey,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Currents API error (${response.status})`);
  }

  const data = (await response.json()) as CurrentsSearchResponse;
  if (data.status !== 'ok' || !Array.isArray(data.news)) {
    return [];
  }

  return normalizeNews(data.news, limit);
}

export function toExternalArticleId(currentsId: string): string {
  return currentsId.startsWith('currents-') ? currentsId : `currents-${currentsId}`;
}

export function mergeNewsRegions(
  existingAttributes: Record<string, unknown> | null | undefined,
  regionCode: string,
): Record<string, unknown> {
  const normalized = regionCode.trim().toUpperCase();
  const previous = new Set<string>();

  if (existingAttributes) {
    const regions = existingAttributes.newsRegions;
    if (Array.isArray(regions)) {
      for (const value of regions) {
        if (typeof value === 'string' && value.trim()) {
          previous.add(value.trim().toUpperCase());
        }
      }
    }
    const single = existingAttributes.newsCountryCode;
    if (typeof single === 'string' && single.trim()) {
      previous.add(single.trim().toUpperCase());
    }
  }

  previous.add(normalized);

  return {
    ...(existingAttributes ?? {}),
    newsCountryCode: normalized,
    newsRegions: Array.from(previous).sort(),
  };
}
