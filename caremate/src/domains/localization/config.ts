import { AFRICAN_COUNTRIES, FRANCOPHONE_AFRICA_CODES } from './african-countries';
import type { CountryConfig, LanguageCode, LanguageConfig } from './types';

/** News / international fallback country code (Currents API). Display name: Global. */
export const INTERNATIONAL_COUNTRY_CODE = 'INT';

export const GLOBAL_COUNTRY_LABEL = 'Global';

export const LANGUAGE_CONFIGS: Record<LanguageCode, LanguageConfig> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    locale: 'en-US',
    currentsLanguageCode: 'en',
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Francais',
    locale: 'fr-FR',
    currentsLanguageCode: 'fr',
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Espanol',
    locale: 'es-ES',
    currentsLanguageCode: 'es',
  },
  yo: {
    code: 'yo',
    name: 'Yoruba',
    nativeName: 'Yoruba',
    locale: 'yo-NG',
    currentsLanguageCode: 'en',
  },
  ha: {
    code: 'ha',
    name: 'Hausa',
    nativeName: 'Hausa',
    locale: 'ha-NG',
    currentsLanguageCode: 'en',
  },
  ig: {
    code: 'ig',
    name: 'Igbo',
    nativeName: 'Igbo',
    locale: 'ig-NG',
    currentsLanguageCode: 'en',
  },
  sw: {
    code: 'sw',
    name: 'Kiswahili',
    nativeName: 'Kiswahili',
    locale: 'sw-KE',
    currentsLanguageCode: 'en',
  },
  tw: {
    code: 'tw',
    name: 'Twi',
    nativeName: 'Twi',
    locale: 'ak-GH',
    currentsLanguageCode: 'en',
  },
  zh: {
    code: 'zh',
    name: 'Mandarin',
    nativeName: '中文',
    locale: 'zh-CN',
    currentsLanguageCode: 'en',
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    locale: 'hi-IN',
    currentsLanguageCode: 'en',
  },
};

const NIGERIA_STATES = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'FCT - Abuja',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
] as const;

function supportedLanguagesForCountry(code: string): LanguageCode[] {
  if (code === INTERNATIONAL_COUNTRY_CODE) {
    return ['en', 'es', 'fr', 'zh', 'hi'];
  }
  if (code === 'NG') {
    return ['en', 'yo', 'ha', 'ig'];
  }
  if (code === 'GH') {
    return ['en', 'tw'];
  }
  if (code === 'KE' || code === 'TZ') {
    return ['en', 'sw'];
  }
  if (FRANCOPHONE_AFRICA_CODES.has(code)) {
    return ['en', 'fr'];
  }
  return ['en'];
}

function buildAfricanCountryConfigs(): CountryConfig[] {
  return AFRICAN_COUNTRIES.map((country) => ({
    code: country.code,
    name: country.name,
    supportedLanguages: supportedLanguagesForCountry(country.code),
    defaultLanguage: 'en' as LanguageCode,
    fallbackCoords: country.fallbackCoords,
    ...(country.code === 'NG' ? { subdivisions: NIGERIA_STATES } : {}),
  }));
}

const GLOBAL_CONFIG: CountryConfig = {
  code: INTERNATIONAL_COUNTRY_CODE,
  name: GLOBAL_COUNTRY_LABEL,
  supportedLanguages: supportedLanguagesForCountry(INTERNATIONAL_COUNTRY_CODE),
  defaultLanguage: 'en',
  fallbackCoords: { latitude: 0, longitude: 0 },
};

/** All configs: African countries (A–Z) + Global (INT). */
export const COUNTRY_CONFIGS: readonly CountryConfig[] = [
  ...buildAfricanCountryConfigs(),
  GLOBAL_CONFIG,
];
