import { AFRICAN_COUNTRIES } from '@/domains/localization/african-countries';
import { localizationService } from '@/domains/localization/service';
import { WORLD_COUNTRIES } from '@/domains/localization/world-countries';

describe('country language configuration', () => {
  it('lists all real countries worldwide without Global', () => {
    const selectable = localizationService.listSelectableCountries();
    expect(selectable).toHaveLength(AFRICAN_COUNTRIES.length + WORLD_COUNTRIES.length);
    expect(selectable.some((country) => country.code === 'INT')).toBe(false);
    expect(selectable.some((country) => country.code === 'MX')).toBe(true);
    expect(selectable.some((country) => country.code === 'US')).toBe(true);
    expect(selectable.some((country) => country.code === 'NG')).toBe(true);
  });

  it('assigns country-specific language sets without new locales', () => {
    expect(localizationService.getSupportedLanguages('NG')).toEqual(['en', 'yo', 'ha', 'ig']);
    expect(localizationService.getSupportedLanguages('GH')).toEqual(['en', 'tw']);
    expect(localizationService.getSupportedLanguages('KE')).toEqual(['en', 'sw']);
    expect(localizationService.getSupportedLanguages('TZ')).toEqual(['en', 'sw']);
    expect(localizationService.getSupportedLanguages('SN')).toEqual(['en', 'fr']);
    expect(localizationService.getSupportedLanguages('FR')).toEqual(['en', 'fr']);
    expect(localizationService.getSupportedLanguages('MX')).toEqual(['en', 'es']);
    expect(localizationService.getSupportedLanguages('ES')).toEqual(['en', 'es']);
    expect(localizationService.getSupportedLanguages('CN')).toEqual(['en', 'zh']);
    expect(localizationService.getSupportedLanguages('IN')).toEqual(['en', 'hi']);
    expect(localizationService.getSupportedLanguages('US')).toEqual(['en']);
    expect(localizationService.getSupportedLanguages('INT')).toEqual([
      'en',
      'es',
      'fr',
      'zh',
      'hi',
    ]);
    expect(localizationService.getSupportedLanguages('ZA')).toEqual(['en']);
  });

  it('defaults every country to English', () => {
    for (const country of localizationService.listSelectableCountries()) {
      expect(localizationService.getDefaultLanguage(country.code)).toBe('en');
    }
  });

  it('keeps Nigeria subdivisions in config without requiring UI', () => {
    expect(localizationService.getCountrySubdivisions('NG').length).toBeGreaterThan(0);
    expect(localizationService.getCountrySubdivisions('MX')).toEqual([]);
  });

  it('displays Global label while keeping INT code for news', () => {
    expect(localizationService.getCountryName('INT')).toBe('Global');
    expect(localizationService.resolveNewsCountryCode('INT')).toBe('INT');
  });

  it('lists configs and country options', () => {
    expect(localizationService.listCountryConfigs().length).toBeGreaterThan(10);
    expect(localizationService.listCountryOptions()[0]).toEqual(
      expect.objectContaining({ name: expect.any(String), code: expect.any(String) }),
    );
  });

  it('falls back to Global for unknown or empty country codes', () => {
    expect(localizationService.getCountryConfig(null).code).toBe('INT');
    expect(localizationService.getCountryConfig('  ').code).toBe('INT');
    expect(localizationService.getCountryConfig('ZZ').code).toBe('INT');
    expect(localizationService.getCountryName(null)).toBeNull();
  });

  it('normalizes language against country support', () => {
    expect(localizationService.normalizeLanguage('NG', 'yo')).toBe('yo');
    expect(localizationService.normalizeLanguage('NG', 'fr')).toBe('en');
    expect(localizationService.normalizeLanguage('NG', null)).toBe('en');
    expect(localizationService.getLanguageConfig('en').locale).toBeTruthy();
  });

  it('resolves fallback coords for Nigeria states and country capital', () => {
    const lagos = localizationService.getFallbackCoords('NG', 'Lagos');
    expect(lagos.latitude).toBeCloseTo(6.5244, 1);
    const unknownState = localizationService.getFallbackCoords('NG', 'Atlantis');
    expect(unknownState).toEqual(localizationService.getCountryConfig('NG').fallbackCoords);
    expect(localizationService.getFallbackCoords('GH')).toEqual(
      localizationService.getCountryConfig('GH').fallbackCoords,
    );
  });

  it('reports fallback pin precision for nearby gating', () => {
    expect(localizationService.getFallbackPin('NG', 'Lagos').precision).toBe('state');
    expect(localizationService.getFallbackPin('NG').precision).toBe('country');
    expect(localizationService.getFallbackPin('GH', 'Greater Accra').precision).toBe('country');
  });

  it('resolves active locale and news language preferences', () => {
    expect(localizationService.getActiveLocale('MX', 'es')).toMatch(/es/i);
    expect(localizationService.resolveNewsLanguageCode('CN', 'zh')).toBe('en');
    expect(localizationService.resolveNewsLanguageCode('MX', 'es')).toBe('es');
    expect(localizationService.resolveNewsCountryCode(null)).toBe('INT');
    expect(
      localizationService.resolvePreferences({
        countryCode: 'NG',
        languageCode: 'yo',
      }),
    ).toEqual(
      expect.objectContaining({
        countryCode: 'NG',
        languageCode: 'yo',
        newsCountryCode: 'NG',
        newsLanguageCode: 'en',
        locale: expect.any(String),
      }),
    );
  });
});
