export type LanguageCode = 'en' | 'fr' | 'es' | 'yo' | 'ha' | 'ig' | 'sw' | 'tw' | 'zh' | 'hi';

export type CurrentsLanguageCode = 'en' | 'fr' | 'es';

export type LanguageConfig = {
  code: LanguageCode;
  name: string;
  nativeName: string;
  locale: string;
  currentsLanguageCode: CurrentsLanguageCode;
};

export type CountryConfig = {
  code: string;
  name: string;
  supportedLanguages: LanguageCode[];
  defaultLanguage: LanguageCode;
  subdivisions?: readonly string[];
  fallbackCoords: {
    latitude: number;
    longitude: number;
  };
};

export type CountryOption = {
  name: string;
  code: string;
};

export type LocalizationPreferences = {
  countryCode: string | null;
  languageCode: string | null;
};
