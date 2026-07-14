import type { MiniAppDefinition } from '@/mini-apps/_kit/registry';
import type { Article, Provider } from '@/types';

export interface SearchResults {
  query: string;
  articles: Article[];
  providers: Provider[];
  tools: MiniAppDefinition[];
}
