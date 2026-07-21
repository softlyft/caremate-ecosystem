import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';

import { createTranslator } from './translate';
import { useActiveLanguage } from './use-active-language';
import type { TranslationParams } from './types';

type TranslateFn = (key: string, params?: TranslationParams) => string;

type I18nContextValue = {
  language: ReturnType<typeof useActiveLanguage>;
  t: TranslateFn;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: PropsWithChildren) {
  const language = useActiveLanguage();
  const value = useMemo(
    () => ({
      language,
      t: createTranslator(language),
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within I18nProvider');
  }
  return context;
}
