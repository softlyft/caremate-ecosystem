import { useMemo } from 'react';

import { useOnboardingDraftStore } from '@/domains/onboarding';
import { localizationService } from '@/domains/localization/service';
import { useLocalizationPreferences } from '@/hooks/use-localization-preferences';

import type { LanguageCode } from '../types';

/** Resolves active UI language from profile/device defaults, with live onboarding draft override. */
export function useActiveLanguage(): LanguageCode {
  const { countryCode: savedCountry, languageCode: savedLanguage } = useLocalizationPreferences();
  const draftCountry = useOnboardingDraftStore((state) => state.countryCode);
  const draftLanguage = useOnboardingDraftStore((state) => state.languageCode);

  return useMemo(
    () =>
      localizationService.normalizeLanguage(
        savedCountry ?? draftCountry,
        savedLanguage ?? draftLanguage,
      ),
    [draftCountry, draftLanguage, savedCountry, savedLanguage],
  );
}
