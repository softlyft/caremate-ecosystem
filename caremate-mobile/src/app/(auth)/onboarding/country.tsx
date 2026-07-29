import { router } from 'expo-router';
import { Globe2 } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { AppText } from '@/components/ui/AppText';
import { CountrySelect } from '@/components/ui/CountrySelect';
import { Button } from '@/components/ui/form-controls';
import { localizationService, useTranslation } from '@/domains/localization';
import { useOnboardingDraftStore } from '@/domains/onboarding';
import { OnboardingPrimaryButton, OnboardingShell } from '@/domains/onboarding/OnboardingShell';
import { ONBOARDING_STEP_THEMES } from '@/domains/onboarding/themes';
import { fontFamily, palette, radius, shadow, spacing } from '@/theme';

const theme = ONBOARDING_STEP_THEMES[1];

export default function OnboardingCountryScreen() {
  const { t } = useTranslation();
  const countryCode = useOnboardingDraftStore((s) => s.countryCode);
  const languageCode = useOnboardingDraftStore((s) => s.languageCode);
  const setCountry = useOnboardingDraftStore((s) => s.setCountry);
  const setLanguage = useOnboardingDraftStore((s) => s.setLanguage);
  const setState = useOnboardingDraftStore((s) => s.setState);
  const supportedLanguages = localizationService.getSupportedLanguages(countryCode);
  const resolvedLanguage = languageCode
    ? localizationService.normalizeLanguage(countryCode, languageCode)
    : null;

  return (
    <OnboardingShell
      step={1}
      title={t('onboarding.country.title')}
      subtitle={t('onboarding.country.subtitle')}
      hero={
        <View style={[styles.heroShell, shadow.soft]}>
          <LinearGradientFill
            colors={[
              { offset: '0%', color: theme.soft },
              { offset: '100%', color: theme.softEnd },
            ]}
            angle={125}
            style={styles.hero}
          >
            <View style={styles.heroIcon}>
              <Globe2 color={theme.accent} size={28} strokeWidth={2.2} />
            </View>
          </LinearGradientFill>
        </View>
      }
      footer={
        <OnboardingPrimaryButton
          label={t('common.continue')}
          accent={theme.accent}
          disabled={!countryCode || !languageCode}
          onPress={() => router.push('/(auth)/onboarding/priorities')}
        />
      }
    >
      <AppText variant="caption" style={[styles.fieldLabel, { color: theme.accent }]}>
        {t('onboarding.country.field.country')}
      </AppText>
      <CountrySelect
        value={countryCode}
        accent={theme.accent}
        soft={theme.soft}
        placeholder={t('onboarding.country.selectPlaceholder')}
        searchPlaceholder={t('onboarding.country.searchPlaceholder')}
        searchEmptyLabel={t('onboarding.country.searchEmpty')}
        sheetTitle={t('onboarding.country.field.country')}
        closeAccessibilityLabel={t('common.close')}
        onChange={(code) => {
          if (!code) {
            return;
          }
          setCountry(code);
          setLanguage(localizationService.getDefaultLanguage(code));
          // State remains in schema/store but is not collected in UI yet.
          setState('');
        }}
      />

      {countryCode ? (
        <Animated.View entering={FadeInDown.duration(420)}>
          <AppText variant="caption" style={[styles.fieldLabel, { color: theme.accent }]}>
            {t('onboarding.country.field.language')}
          </AppText>
          <View style={styles.chipRow}>
            {supportedLanguages.map((language) => {
              const selected = resolvedLanguage === language;
              const label = localizationService.getLanguageConfig(language);
              return (
                <Button
                  key={language}
                  style={[
                    styles.chip,
                    selected && {
                      backgroundColor: theme.soft,
                      borderColor: theme.accent,
                    },
                  ]}
                  scale={0.95}
                  onPress={() => setLanguage(language)}
                  variant="plain"
                >
                  <AppText
                    variant="caption"
                    style={
                      selected
                        ? [styles.chipTextSelected, { color: theme.accent }]
                        : styles.chipText
                    }
                  >
                    {label.nativeName}
                  </AppText>
                </Button>
              );
            })}
          </View>
        </Animated.View>
      ) : null}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  heroShell: {
    borderRadius: radius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    marginBottom: spacing.xs,
  },
  hero: {
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${theme.accent}33`,
  },
  fieldLabel: {
    fontFamily: fontFamily.semiBold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: palette.divider,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  chipText: {
    color: palette.textSecondary,
  },
  chipTextSelected: {
    fontFamily: fontFamily.semiBold,
  },
});
