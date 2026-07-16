import { router } from 'expo-router';
import { Globe2, MapPin } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { PressableScale } from '@/components/motion/PressableScale';
import { AppText } from '@/components/ui/AppText';
import { Input } from '@/components/ui/form-controls';
import { localizationService, useTranslation } from '@/domains/localization';
import { useOnboardingDraftStore } from '@/domains/onboarding';
import { OnboardingPrimaryButton, OnboardingShell } from '@/domains/onboarding/OnboardingShell';
import { ONBOARDING_STEP_THEMES } from '@/domains/onboarding/themes';
import { fontFamily, palette, radius, shadow, spacing } from '@/theme';

const theme = ONBOARDING_STEP_THEMES[2];

export default function OnboardingCountryScreen() {
  const { t } = useTranslation();
  const countryCode = useOnboardingDraftStore((s) => s.countryCode);
  const languageCode = useOnboardingDraftStore((s) => s.languageCode);
  const state = useOnboardingDraftStore((s) => s.state);
  const setCountry = useOnboardingDraftStore((s) => s.setCountry);
  const setLanguage = useOnboardingDraftStore((s) => s.setLanguage);
  const setState = useOnboardingDraftStore((s) => s.setState);
  const subdivisions = localizationService.getCountrySubdivisions(countryCode);
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
      <View style={styles.chipRow}>
        {localizationService.listSelectableCountries().map((country, index) => {
          const selected = countryCode === country.code;
          return (
            <Animated.View
              key={country.code}
              entering={FadeInDown.delay(80 + index * 35).duration(400)}
            >
              <PressableScale
                style={[
                  styles.chip,
                  selected && {
                    backgroundColor: theme.soft,
                    borderColor: theme.accent,
                  },
                ]}
                scale={0.95}
                onPress={() => {
                  if (selected) {
                    return;
                  }
                  setCountry(country.code);
                  setLanguage(localizationService.getDefaultLanguage(country.code));
                  if (!localizationService.getCountrySubdivisions(country.code).includes(state)) {
                    setState('');
                  }
                }}
              >
                <AppText
                  variant="caption"
                  style={
                    selected ? [styles.chipTextSelected, { color: theme.accent }] : styles.chipText
                  }
                >
                  {country.name}
                </AppText>
              </PressableScale>
            </Animated.View>
          );
        })}
      </View>

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
                <PressableScale
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
                </PressableScale>
              );
            })}
          </View>
        </Animated.View>
      ) : null}

      {countryCode ? (
        <Animated.View entering={FadeInDown.duration(420)} style={styles.stateBlock}>
          <AppText variant="caption" style={[styles.fieldLabel, { color: theme.accent }]}>
            {t('onboarding.country.field.state')}
          </AppText>
          {subdivisions.length > 0 ? (
            <View style={styles.chipRow}>
              {subdivisions.map((item) => {
                const selected = state === item;
                return (
                  <PressableScale
                    key={item}
                    style={[
                      styles.chip,
                      selected && {
                        backgroundColor: theme.soft,
                        borderColor: theme.accent,
                      },
                    ]}
                    scale={0.95}
                    onPress={() => setState(selected ? '' : item)}
                  >
                    <AppText
                      variant="caption"
                      style={
                        selected ? [styles.chipTextSelected, { color: theme.accent }] : styles.chipText
                      }
                    >
                      {item}
                    </AppText>
                  </PressableScale>
                );
              })}
            </View>
          ) : (
            <View style={styles.inputRow}>
              <MapPin color={theme.accent} size={16} />
              <View style={{ flex: 1 }}>
                <Input
                  placeholder={t('onboarding.country.statePlaceholder')}
                  value={state}
                  onChangeText={setState}
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}
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
  stateBlock: {
    gap: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
