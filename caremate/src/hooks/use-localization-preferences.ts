import { useQuery } from '@tanstack/react-query';

import { localizationService } from '@/domains/localization';
import { profileRepository } from '@/domains/profile/repository';
import { QUERY_KEYS } from '@/constants/config';
import { useCurrentUserId, useIsGuest } from '@/hooks/use-current-user-id';
import { useDeviceDefaults } from '@/hooks/use-device-defaults';

export function useLocalizationPreferences() {
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();
  const deviceDefaultsQuery = useDeviceDefaults();

  const profileQuery = useQuery({
    queryKey: [...QUERY_KEYS.profile, userId],
    queryFn: () => profileRepository.findByUserId(userId),
    enabled: !isGuest,
  });

  const countryCode = isGuest
    ? (deviceDefaultsQuery.data?.countryCode ?? null)
    : (profileQuery.data?.countryCode ?? null);
  const languageCode = isGuest
    ? (deviceDefaultsQuery.data?.languageCode ?? null)
    : (profileQuery.data?.languageCode ?? null);

  const resolved = localizationService.resolvePreferences({ countryCode, languageCode });

  return {
    isGuest,
    isReady: isGuest ? deviceDefaultsQuery.isFetched : profileQuery.isFetched,
    countryCode,
    languageCode,
    resolvedLanguage: resolved.languageCode,
    locale: resolved.locale,
    newsCountryCode: resolved.newsCountryCode,
    newsLanguageCode: resolved.newsLanguageCode,
    countryConfig: localizationService.getCountryConfig(countryCode),
    supportedLanguages: localizationService.getSupportedLanguages(countryCode),
  };
}
