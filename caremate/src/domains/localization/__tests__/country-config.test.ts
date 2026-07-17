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
});
