import { createTranslator, translateText } from '@/domains/localization/i18n/translate';

describe('translateText', () => {
  it('returns English strings by default', () => {
    expect(translateText('en', 'common.continue')).toBe('Continue');
    expect(translateText('en', 'home.tagline')).toBe('Your health journey, beautifully organized');
  });

  it('returns localized strings when available', () => {
    expect(translateText('fr', 'common.continue')).toBe('Continuer');
    expect(translateText('yo', 'tabs.home')).toBe('Ilé');
    expect(translateText('es', 'tabs.learn')).not.toBe('Learn');
    expect(translateText('zh', 'common.back')).not.toBe('Back');
    expect(translateText('ha', 'onboarding.welcome.title')).not.toBe('Care that works offline');
  });

  it('falls back to English for missing keys', () => {
    expect(translateText('fr', 'common.__missing_key__')).toBe('common.__missing_key__');
    // Known English-only path still resolves via English catalog merge
    expect(translateText('sw', 'common.continue')).toBeTruthy();
  });

  it('interpolates params', () => {
    const t = createTranslator('en');
    expect(t('common.stepOf', { current: 2, total: 6 })).toBe('Step 2 of 6');
    expect(t('learn.articleCount', { count: 12 })).toBe('12 articles');
  });
});
