import { localizationService } from '@/domains/localization/service';

import type { LanguageCode } from '../types';

export function isOnboardingWelcomePath(pathname: string): boolean {
  return /\/onboarding\/?$/.test(pathname);
}

export function isOnboardingPath(pathname: string): boolean {
  return /\/onboarding(\/|$)/.test(pathname);
}

type ResolveActiveLanguageInput = {
  pathname: string;
  savedCountry: string | null;
  savedLanguage: string | null;
  draftCountry: string | null;
  draftLanguage: string | null;
};

/** Resolves UI language; welcome stays English, onboarding uses draft selection immediately. */
export function resolveActiveLanguage({
  pathname,
  savedCountry,
  savedLanguage,
  draftCountry,
  draftLanguage,
}: ResolveActiveLanguageInput): LanguageCode {
  if (isOnboardingWelcomePath(pathname)) {
    return 'en';
  }

  if (isOnboardingPath(pathname)) {
    if (draftLanguage) {
      return localizationService.normalizeLanguage(draftCountry, draftLanguage);
    }
    return 'en';
  }

  return localizationService.normalizeLanguage(
    savedCountry ?? draftCountry,
    savedLanguage ?? draftLanguage,
  );
}
