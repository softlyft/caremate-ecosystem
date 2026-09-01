import {
  isOnboardingPath,
  isOnboardingWelcomePath,
  resolveActiveLanguage,
} from '@/domains/localization/i18n/resolve-active-language';

describe('onboarding path helpers', () => {
  it('detects welcome routes', () => {
    expect(isOnboardingWelcomePath('/onboarding')).toBe(true);
    expect(isOnboardingWelcomePath('/(auth)/onboarding')).toBe(true);
    expect(isOnboardingWelcomePath('/(auth)/onboarding/')).toBe(true);
    expect(isOnboardingWelcomePath('/(auth)/onboarding/country')).toBe(false);
  });

  it('detects onboarding routes', () => {
    expect(isOnboardingPath('/onboarding')).toBe(true);
    expect(isOnboardingPath('/(auth)/onboarding/country')).toBe(true);
    expect(isOnboardingPath('/(auth)/onboarding/emergency-basics')).toBe(true);
    expect(isOnboardingPath('/(app)/(tabs)/home')).toBe(false);
  });
});

describe('resolveActiveLanguage', () => {
  it('keeps welcome in English even when saved language is not English', () => {
    expect(
      resolveActiveLanguage({
        pathname: '/(auth)/onboarding',
        savedCountry: 'NG',
        savedLanguage: 'yo',
        draftCountry: null,
        draftLanguage: null,
      }),
    ).toBe('en');
  });

  it('uses English on country step until a draft language is chosen', () => {
    expect(
      resolveActiveLanguage({
        pathname: '/(auth)/onboarding/country',
        savedCountry: 'NG',
        savedLanguage: 'yo',
        draftCountry: 'NG',
        draftLanguage: null,
      }),
    ).toBe('en');
  });

  it('applies draft language immediately during onboarding', () => {
    expect(
      resolveActiveLanguage({
        pathname: '/(auth)/onboarding/country',
        savedCountry: 'NG',
        savedLanguage: 'en',
        draftCountry: 'NG',
        draftLanguage: 'yo',
      }),
    ).toBe('yo');
  });

  it('keeps draft language on later onboarding steps', () => {
    expect(
      resolveActiveLanguage({
        pathname: '/(auth)/onboarding/emergency-basics',
        savedCountry: 'NG',
        savedLanguage: 'en',
        draftCountry: 'NG',
        draftLanguage: 'ha',
      }),
    ).toBe('ha');
  });

  it('uses saved preferences outside onboarding', () => {
    expect(
      resolveActiveLanguage({
        pathname: '/(app)/(tabs)/home',
        savedCountry: 'NG',
        savedLanguage: 'yo',
        draftCountry: 'NG',
        draftLanguage: 'ha',
      }),
    ).toBe('yo');
  });
});
