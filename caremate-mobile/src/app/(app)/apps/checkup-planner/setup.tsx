import { router, useNavigation } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { localizationService, useTranslation } from '@/domains/localization';
import {
  MiniAppCard,
  MiniAppChip,
  MiniAppCta,
  MiniAppScreen,
  MonthCalendarGrid,
  MonthCalendarNavigator,
  getMiniAppTheme,
} from '@/mini-apps/_kit';
import {
  useCheckupPlannerHydrated,
  useCheckupPlannerStore,
  type PlannerGender,
} from '@/mini-apps/checkup-planner/store';
import { formatDisplayDate, toDateKey } from '@/mini-apps/checkup-planner/utils';
import { localizeGenderOptions } from '@/mini-apps/checkup-planner/localize';
import { layoutSpacing, palette, spacing } from '@/theme';

const theme = getMiniAppTheme('checkup-planner');

export default function CheckupPlannerSetupScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const today = useMemo(() => new Date(), []);
  const [monthRef, setMonthRef] = useState(
    () => new Date(today.getFullYear() - 30, today.getMonth(), 1),
  );
  const hydrated = useCheckupPlannerHydrated();

  const profile = useCheckupPlannerStore((state) => state.profile);
  const saveProfile = useCheckupPlannerStore((state) => state.saveProfile);
  const clearProfile = useCheckupPlannerStore((state) => state.clearProfile);

  const [dateOfBirth, setDateOfBirth] = useState<string | null>(profile?.dateOfBirth ?? null);
  const [gender, setGender] = useState<PlannerGender | null>(profile?.gender ?? null);
  const [regionCode, setRegionCode] = useState<string | null>(profile?.regionCode ?? null);
  const [profileSnapshot, setProfileSnapshot] = useState(profile);

  if (profile !== profileSnapshot) {
    setProfileSnapshot(profile);
    if (profile) {
      setDateOfBirth(profile.dateOfBirth);
      setGender(profile.gender);
      setRegionCode(profile.regionCode);
      const [year, month] = profile.dateOfBirth.split('-').map(Number);
      if (year && month) {
        setMonthRef(new Date(year, month - 1, 1));
      }
    }
  }

  useEffect(() => {
    navigation.setOptions({
      title: profile ? t('apps.checkupPlanner.editProfile') : t('apps.checkupPlanner.setUpPlanner'),
    });
  }, [navigation, profile, t]);

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.color} />
      </View>
    );
  }

  return (
    <MiniAppScreen>
      <AppText variant="subtitle" style={styles.intro}>
        {t('apps.checkup.ui.setupIntro')}
      </AppText>

      <MiniAppCard index={1} title={t('apps.checkup.ui.genderLabel')} theme={theme}>
        <View style={styles.chipRow}>
          {localizeGenderOptions(t).map((option) => (
            <MiniAppChip
              key={option.id}
              label={option.label}
              selected={option.id === gender}
              accent={theme.color}
              soft={theme.backgroundColor}
              onPress={() => setGender(option.id)}
            />
          ))}
        </View>
      </MiniAppCard>

      <MiniAppCard index={2} theme={theme}>
        <MonthCalendarNavigator
          accentColor={theme.color}
          monthRef={monthRef}
          onMonthChange={setMonthRef}
        />
        <AppText variant="caption" style={styles.muted}>
          {t('apps.checkup.ui.tapDob')}
        </AppText>
        <MonthCalendarGrid
          monthRef={monthRef}
          interactive
          accentColor={theme.color}
          onDayPress={(dayKey) => {
            if (dayKey > toDateKey(today)) {
              return;
            }
            setDateOfBirth(dayKey);
          }}
          getDayState={(dayKey) => ({
            selected: dayKey === dateOfBirth,
            today: dayKey === toDateKey(today),
          })}
        />
        {dateOfBirth ? (
          <AppText variant="body">
            {t('apps.checkup.ui.dobLabel', { date: formatDisplayDate(dateOfBirth) })}
          </AppText>
        ) : null}
      </MiniAppCard>

      <MiniAppCard index={3} title={t('apps.checkup.ui.regionOptional')} theme={theme}>
        <AppText variant="caption" style={styles.muted}>
          {t('apps.checkup.ui.regionHint')}
        </AppText>
        <View style={styles.chipRow}>
          <MiniAppChip
            label={t('apps.checkup.ui.globalOption', {
              code: localizationService.internationalCountryCode,
            })}
            selected={regionCode === null}
            accent={theme.color}
            soft={theme.backgroundColor}
            onPress={() => setRegionCode(null)}
          />
          {localizationService
            .listCountryOptions()
            .filter((country) => country.code !== localizationService.internationalCountryCode)
            .map((country) => (
              <MiniAppChip
                key={country.code}
                label={country.name}
                selected={regionCode === country.code}
                accent={theme.color}
                soft={theme.backgroundColor}
                onPress={() => setRegionCode(country.code)}
              />
            ))}
        </View>
      </MiniAppCard>

      <MiniAppCta
        label={
          profile ? t('apps.checkupPlanner.setupSaveEdit') : t('apps.checkupPlanner.setupSave')
        }
        accent={theme.color}
        soft={theme.backgroundColor}
        index={4}
        onPress={() => {
          if (!dateOfBirth || !gender) {
            return;
          }
          saveProfile({ dateOfBirth, gender, regionCode });
          router.back();
        }}
      />

      {profile ? (
        <MiniAppCta
          label={t('apps.checkup.ui.clearData')}
          accent={theme.color}
          soft={theme.backgroundColor}
          secondary
          index={5}
          onPress={() => {
            Alert.alert(
              t('apps.checkup.ui.clearConfirmTitle'),
              t('apps.checkup.ui.clearConfirmMessage'),
              [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('common.clear'),
                  style: 'destructive',
                  onPress: () => {
                    clearProfile();
                    router.back();
                  },
                },
              ],
            );
          }}
        />
      ) : null}
    </MiniAppScreen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: layoutSpacing.screenHorizontal,
    backgroundColor: palette.surface,
  },
  intro: {
    color: palette.textSecondary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  muted: {
    color: palette.textSecondary,
  },
});
