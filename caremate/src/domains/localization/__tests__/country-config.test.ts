import { AFRICAN_COUNTRIES } from '@/domains/localization/african-countries';
import { INTERNATIONAL_COUNTRY_CODE } from '@/domains/localization/config';
import { localizationService } from '@/domains/localization/service';

describe('country language configuration', () => {
  it('lists all African countries plus Global', () => {
    const selectable = localizationService.listSelectableCountries();
    expect(selectable).toHaveLength(AFRICAN_COUNTRIES.length + 1);
    expect(selectable.at(-1)?.code).toBe(INTERNATIONAL_COUNTRY_CODE);
    expect(selectable.at(-1)?.name).toBe('Global');
  });

  it('assigns country-specific language sets', () => {
    expect(localizationService.getSupportedLanguages('NG')).toEqual(['en', 'yo', 'ha', 'ig']);
    expect(localizationService.getSupportedLanguages('GH')).toEqual(['en', 'tw']);
    expect(localizationService.getSupportedLanguages('KE')).toEqual(['en', 'sw']);
    expect(localizationService.getSupportedLanguages('TZ')).toEqual(['en', 'sw']);
    expect(localizationService.getSupportedLanguages('SN')).toEqual(['en', 'fr']);
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

  it('displays Global label while keeping INT code for news', () => {
    expect(localizationService.getCountryName('INT')).toBe('Global');
    expect(localizationService.resolveNewsCountryCode('INT')).toBe('INT');
  });
});
