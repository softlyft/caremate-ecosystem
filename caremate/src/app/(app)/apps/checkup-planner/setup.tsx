import { router, useNavigation } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { INTERNATIONAL_COUNTRY_CODE, NEWS_COUNTRIES } from '@/constants/locations';
import {
  MiniAppCard,
  MiniAppChip,
  MiniAppCta,
  MiniAppScreen,
  MonthCalendarGrid,
  getMiniAppTheme,
} from '@/mini-apps/_kit';
import { GENDER_OPTIONS } from '@/mini-apps/checkup-planner/constants';
import {
  useCheckupPlannerHydrated,
  useCheckupPlannerStore,
  type PlannerGender,
} from '@/mini-apps/checkup-planner/store';
import { formatDisplayDate, toDateKey } from '@/mini-apps/checkup-planner/utils';
import { layoutSpacing, palette, spacing } from '@/theme';

const theme = getMiniAppTheme('checkup-planner');

export default function CheckupPlannerSetupScreen() {
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
      title: profile ? 'Edit Profile' : 'Set Up Planner',
    });
  }, [navigation, profile]);

  const monthLabel = monthRef.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

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
        We use your date of birth, gender, and region to suggest standard checkups. Region is
        optional and defaults to International.
      </AppText>

      <MiniAppCard index={1} title="Gender" theme={theme}>
        <View style={styles.chipRow}>
          {GENDER_OPTIONS.map((option) => (
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
        <View style={styles.monthHeader}>
          <Pressable
            hitSlop={12}
            onPress={() =>
              setMonthRef(new Date(monthRef.getFullYear(), monthRef.getMonth() - 1, 1))
            }
          >
            <ChevronLeft color={palette.textSecondary} size={20} />
          </Pressable>
          <AppText variant="cardTitle">{monthLabel}</AppText>
          <Pressable
            hitSlop={12}
            onPress={() =>
              setMonthRef(new Date(monthRef.getFullYear(), monthRef.getMonth() + 1, 1))
            }
          >
            <ChevronRight color={palette.textSecondary} size={20} />
          </Pressable>
        </View>
        <AppText variant="caption" style={styles.muted}>
          Tap your date of birth.
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
          <AppText variant="body">DOB: {formatDisplayDate(dateOfBirth)}</AppText>
        ) : null}
      </MiniAppCard>

      <MiniAppCard index={3} title="Region (optional)" theme={theme}>
        <AppText variant="caption" style={styles.muted}>
          Used for a few region-aware tips. Leave as International if unsure.
        </AppText>
        <View style={styles.chipRow}>
          <MiniAppChip
            label={`International (${INTERNATIONAL_COUNTRY_CODE})`}
            selected={regionCode === null}
            accent={theme.color}
            soft={theme.backgroundColor}
            onPress={() => setRegionCode(null)}
          />
          {NEWS_COUNTRIES.map((country) => (
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
        label={profile ? 'Save changes' : 'Save and view plan'}
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
          label="Clear planner data"
          accent={theme.color}
          soft={theme.backgroundColor}
          secondary
          index={5}
          onPress={() => {
            Alert.alert(
              'Clear checkup planner?',
              'Your profile and completion history will be removed.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Clear',
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
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  muted: {
    color: palette.textSecondary,
  },
});
