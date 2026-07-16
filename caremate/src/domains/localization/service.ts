import {
  COUNTRY_CONFIGS,
  GLOBAL_COUNTRY_LABEL,
  INTERNATIONAL_COUNTRY_CODE,
  LANGUAGE_CONFIGS,
} from './config';
import { NIGERIA_STATE_FALLBACK_COORDS } from './nigeria-state-coords';
import type {
  CountryConfig,
  CountryOption,
  CurrentsLanguageCode,
  LanguageCode,
  LanguageConfig,
  LocalizationPreferences,
} from './types';

function internationalConfig(): CountryConfig {
  return (
    COUNTRY_CONFIGS.find((country) => country.code === INTERNATIONAL_COUNTRY_CODE) ??
    COUNTRY_CONFIGS[0]!
  );
}

class LocalizationService {
  readonly internationalCountryCode = INTERNATIONAL_COUNTRY_CODE;

  listCountryConfigs(): readonly CountryConfig[] {
    return COUNTRY_CONFIGS;
  }

  /** All African countries plus Global (INT), sorted A–Z with Global last. */
  listSelectableCountries(): readonly CountryConfig[] {
    const african = COUNTRY_CONFIGS.filter(
      (country) => country.code !== INTERNATIONAL_COUNTRY_CODE,
    );
    const global = COUNTRY_CONFIGS.find((country) => country.code === INTERNATIONAL_COUNTRY_CODE);
    return global ? [...african, global] : african;
  }

  listCountryOptions(): CountryOption[] {
    return this.listSelectableCountries().map((country) => ({
      name: country.code === INTERNATIONAL_COUNTRY_CODE ? GLOBAL_COUNTRY_LABEL : country.name,
      code: country.code,
    }));
  }

  getCountryConfig(code: string | null | undefined): CountryConfig {
    const normalized = code?.trim().toUpperCase();
    if (!normalized) {
      return internationalConfig();
    }
    return COUNTRY_CONFIGS.find((country) => country.code === normalized) ?? internationalConfig();
  }

  getCountryName(code: string | null | undefined): string | null {
    if (!code) {
      return null;
    }
    if (code.trim().toUpperCase() === INTERNATIONAL_COUNTRY_CODE) {
      return GLOBAL_COUNTRY_LABEL;
    }
    return this.getCountryConfig(code).name;
  }

  getCountrySubdivisions(code: string | null | undefined): readonly string[] {
    return this.getCountryConfig(code).subdivisions ?? [];
  }

  getSupportedLanguages(code: string | null | undefined): readonly LanguageCode[] {
    return this.getCountryConfig(code).supportedLanguages;
  }

  getDefaultLanguage(code: string | null | undefined): LanguageCode {
    return this.getCountryConfig(code).defaultLanguage;
  }

  getLanguageConfig(code: LanguageCode): LanguageConfig {
    return LANGUAGE_CONFIGS[code];
  }

  normalizeLanguage(
    countryCode: string | null | undefined,
    languageCode: string | null | undefined,
  ): LanguageCode {
    const normalized = (languageCode ?? '').trim().toLowerCase() as LanguageCode;
    const supported = this.getSupportedLanguages(countryCode);
    if (supported.includes(normalized)) {
      return normalized;
    }
    return this.getDefaultLanguage(countryCode);
  }

  /**
   * Approximate pin for Nearby when GPS is off / denied / unavailable.
   * Prefers the selected subdivision (e.g. Nigerian state capital) when known,
   * otherwise the country capital-area pin from country config.
   */
  getFallbackCoords(
    countryCode: string | null | undefined,
    state?: string | null | undefined,
  ): CountryConfig['fallbackCoords'] {
    const country = this.getCountryConfig(countryCode);
    const subdivision = state?.trim();
    if (country.code === 'NG' && subdivision) {
      const statePin = NIGERIA_STATE_FALLBACK_COORDS[subdivision];
      if (statePin) {
        return statePin;
      }
    }
    return country.fallbackCoords;
  }

  getActiveLocale(
    countryCode: string | null | undefined,
    languageCode: string | null | undefined,
  ): string {
    const resolved = this.normalizeLanguage(countryCode, languageCode);
    return LANGUAGE_CONFIGS[resolved].locale;
  }

  resolveNewsCountryCode(countryCode: string | null | undefined): string {
    const code = countryCode?.trim().toUpperCase();
    return code || INTERNATIONAL_COUNTRY_CODE;
  }

  resolveNewsLanguageCode(
    countryCode: string | null | undefined,
    languageCode: string | null | undefined,
  ): CurrentsLanguageCode {
    const normalized = this.normalizeLanguage(countryCode, languageCode);
    return LANGUAGE_CONFIGS[normalized]?.currentsLanguageCode ?? 'en';
  }

  resolvePreferences(preferences: LocalizationPreferences): {
    countryCode: string;
    languageCode: LanguageCode;
    locale: string;
    newsCountryCode: string;
    newsLanguageCode: CurrentsLanguageCode;
  } {
    const newsCountryCode = this.resolveNewsCountryCode(preferences.countryCode);
    const languageCode = this.normalizeLanguage(preferences.countryCode, preferences.languageCode);
    return {
      countryCode: newsCountryCode,
      languageCode,
      locale: this.getActiveLocale(preferences.countryCode, languageCode),
      newsCountryCode,
      newsLanguageCode: this.resolveNewsLanguageCode(preferences.countryCode, languageCode),
    };
  }
}

export const localizationService = new LocalizationService();
