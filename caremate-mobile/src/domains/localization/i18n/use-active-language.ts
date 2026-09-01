import { usePathname } from 'expo-router';
import { useMemo } from 'react';

import { useOnboardingDraftStore } from '@/domains/onboarding';
import { useLocalizationPreferences } from '@/hooks/use-localization-preferences';

import type { LanguageCode } from '../types';

import { resolveActiveLanguage } from './resolve-active-language';

/** Resolves active UI language from profile/device defaults, with live onboarding draft override. */
export function useActiveLanguage(): LanguageCode {
  const pathname = usePathname();
  const { countryCode: savedCountry, languageCode: savedLanguage } = useLocalizationPreferences();
  const draftCountry = useOnboardingDraftStore((state) => state.countryCode);
  const draftLanguage = useOnboardingDraftStore((state) => state.languageCode);

  return useMemo(
    () =>
      resolveActiveLanguage({
        pathname,
        savedCountry,
        savedLanguage,
        draftCountry,
        draftLanguage,
      }),
    [draftCountry, draftLanguage, pathname, savedCountry, savedLanguage],
  );
}
