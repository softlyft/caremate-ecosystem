import type { TranslationParams } from '@/domains/localization/i18n/types';

export type TranslateFn = (key: string, params?: TranslationParams) => string;

/** Pick singular vs plural key when count !== 1. */
export function pluralKey(base: string, count: number): string {
  return count === 1 ? base : `${base}_other`;
}
