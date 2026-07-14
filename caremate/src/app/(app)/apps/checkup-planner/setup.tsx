import { router, useNavigation } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import { INTERNATIONAL_COUNTRY_CODE, NEWS_COUNTRIES } from '@/constants/locations';
import { GENDER_OPTIONS } from '@/mini-apps/checkup-planner/constants';
import {
  useCheckupPlannerHydrated,
  useCheckupPlannerStore,
  type PlannerGender,
} from '@/mini-apps/checkup-planner/store';
import { formatDisplayDate, toDateKey } from '@/mini-apps/checkup-planner/utils';
import { MonthCalendarGrid } from '@/mini-apps/_kit/components/MonthCalendarGrid';
import { layoutSpacing, palette, radius, spacing } from '@/theme';

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
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <AppText variant="subtitle">
        We use your date of birth, gender, and region to suggest standard checkups. Region is
        optional and defaults to International.
      </AppText>

      <View style={styles.card}>
        <AppText variant="cardTitle">Gender</AppText>
        <View style={styles.chipRow}>
          {GENDER_OPTIONS.map((option) => {
            const selected = option.id === gender;
            return (
              <Pressable
                key={option.id}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setGender(option.id)}
              >
                <AppText variant="caption" style={selected ? styles.chipTextSelected : undefined}>
                  {option.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
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
      </View>

      <View style={styles.card}>
        <AppText variant="cardTitle">Region (optional)</AppText>
        <AppText variant="caption" style={styles.muted}>
          Used for a few region-aware tips. Leave as International if unsure.
        </AppText>
        <View style={styles.chipRow}>
          <Pressable
            style={[styles.chip, regionCode === null && styles.chipSelected]}
            onPress={() => setRegionCode(null)}
          >
            <AppText
              variant="caption"
              style={regionCode === null ? styles.chipTextSelected : undefined}
            >
              International ({INTERNATIONAL_COUNTRY_CODE})
            </AppText>
          </Pressable>
          {NEWS_COUNTRIES.map((country) => {
            const selected = regionCode === country.code;
            return (
              <Pressable
                key={country.code}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setRegionCode(country.code)}
              >
                <AppText variant="caption" style={selected ? styles.chipTextSelected : undefined}>
                  {country.name}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Button
        label={profile ? 'Save changes' : 'Save and view plan'}
        disabled={!dateOfBirth || !gender}
        onPress={() => {
          if (!dateOfBirth || !gender) {
            return;
          }
          saveProfile({ dateOfBirth, gender, regionCode });
          router.back();
        }}
      />

      {profile ? (
        <Button
          label="Clear planner data"
          variant="secondary"
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    padding: layoutSpacing.screenHorizontal,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: layoutSpacing.screenHorizontal,
    backgroundColor: palette.background,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: layoutSpacing.cardPadding,
    gap: spacing.sm,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.divider,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: palette.background,
  },
  chipSelected: {
    backgroundColor: '#CCFBF1',
    borderColor: '#0F766E',
  },
  chipTextSelected: {
    color: '#0F766E',
  },
  muted: {
    color: palette.textSecondary,
  },
});
