import { articleRepository } from '@/domains/articles/repository';
import { providerRepository } from '@/domains/providers/repository';
import { MINI_APPS } from '@/mini-apps/_kit/registry';

import { filterMiniApps, MAX_RESULTS_PER_SECTION, normalizeSearchQuery } from './match';
import type { SearchResults } from './types';

export async function runGlobalSearch(query: string, userKey = 'guest'): Promise<SearchResults> {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) {
    return { query: '', articles: [], providers: [], tools: [] };
  }

  const [articles, providers] = await Promise.all([
    articleRepository.findAll(normalized, userKey),
    providerRepository.findAll({ search: normalized }),
  ]);

  return {
    query: normalized,
    articles: articles.slice(0, MAX_RESULTS_PER_SECTION),
    providers: providers.slice(0, MAX_RESULTS_PER_SECTION),
    tools: filterMiniApps(normalized, MINI_APPS),
  };
}
