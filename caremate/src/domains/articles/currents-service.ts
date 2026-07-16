import { config } from '@/constants/env';
import { localizationService } from '@/domains/localization';

export interface CurrentsNewsItem {
  id: string;
  title: string;
  description: string;
  url: string;
  author: string;
  image: string;
  language: string;
  category: string[];
  published: string;
}

interface CurrentsSearchResponse {
  status: string;
  news?: CurrentsNewsItem[];
}

const CURRENTS_BASE_URL = 'https://api.currentsapi.services/v1';

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

async function searchHealthNews(
  limit: number,
  countryCode?: string | null,
  languageCode: 'en' | 'fr' | 'es' = 'en',
): Promise<CurrentsNewsItem[]> {
  const params = new URLSearchParams({
    category: 'health',
    language: languageCode,
  });

  // Currents often returns an empty list for `INT` and many country codes (including NG).
  // Only send `country` for concrete ISO codes; omit it for international/global results.
  const normalized = countryCode?.trim().toUpperCase();
  if (normalized && normalized !== localizationService.internationalCountryCode) {
    params.set('country', normalized);
  }

  const response = await fetch(`${CURRENTS_BASE_URL}/search?${params.toString()}`, {
    headers: {
      Authorization: config.currentsApiKey,
    },
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

export const currentsService = {
  isConfigured(): boolean {
    return config.isCurrentsConfigured;
  },

  async fetchHealthNews(
    limit = 10,
    countryCode = config.currentsCountry,
    languageCode: 'en' | 'fr' | 'es' = 'en',
  ): Promise<CurrentsNewsItem[]> {
    if (!config.isCurrentsConfigured) {
      return [];
    }

    const primary = await searchHealthNews(limit, countryCode, languageCode);
    if (primary.length > 0) {
      return primary;
    }

    // Country-scoped health feeds are frequently empty — fall back to global English health news.
    const normalized = countryCode?.trim().toUpperCase();
    if (normalized && normalized !== localizationService.internationalCountryCode) {
      return searchHealthNews(limit, localizationService.internationalCountryCode, languageCode);
    }

    return [];
  },
};
