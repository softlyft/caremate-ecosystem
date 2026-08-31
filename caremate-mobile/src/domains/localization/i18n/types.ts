export type TranslationParams = Record<string, string | number>;

export type TranslationNode = string | { [key: string]: TranslationNode };

export type TranslationNamespace =
  | 'common'
  | 'tabs'
  | 'onboarding'
  | 'settings'
  | 'home'
  | 'learn'
  | 'nearby'
  | 'insurance'
  | 'profile'
  | 'auth'
  | 'emergency'
  | 'family'
  | 'setup'
  | 'apps'
  | 'search'
  | 'messages'
  | 'nav'
  | 'billing';

export type TranslationCatalog = Record<TranslationNamespace, TranslationNode>;

export type TranslationKey = `${TranslationNamespace}.${string}`;
