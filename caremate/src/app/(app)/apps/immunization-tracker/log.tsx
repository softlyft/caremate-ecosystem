import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Input } from '@/components/ui/form-controls';
import { LoadingState } from '@/components/ui/screen-states';
import { VACCINE_SCHEDULE } from '@/mini-apps/immunization-tracker/constants';
import {
  useImmunizationTrackerHydrated,
  useImmunizationTrackerStore,
} from '@/mini-apps/immunization-tracker/store';
import { formatDisplayDate, toDateKey } from '@/mini-apps/immunization-tracker/utils';
import {
  MiniAppCard,
  MiniAppChip,
  MiniAppCta,
  MiniAppHero,
  MiniAppScreen,
  MonthCalendarGrid,
  StatusPill,
  getMiniAppTheme,
} from '@/mini-apps/_kit';
import { palette, spacing } from '@/theme';

const APP_ID = 'immunization-tracker' as const;

export default function ImmunizationLogScreen() {
  const theme = getMiniAppTheme(APP_ID);
  const { vaccineId: initialVaccineId, profileId: paramProfileId } = useLocalSearchParams<{
    vaccineId?: string;
    profileId?: string;
  }>();
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const [monthRef, setMonthRef] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const hydrated = useImmunizationTrackerHydrated();

  const profiles = useImmunizationTrackerStore((state) => state.profiles);
  const activeProfileId = useImmunizationTrackerStore((state) => state.activeProfileId);
  const records = useImmunizationTrackerStore((state) => state.records);
  const upsertRecord = useImmunizationTrackerStore((state) => state.upsertRecord);
  const removeRecord = useImmunizationTrackerStore((state) => state.removeRecord);

  const profileId =
    (typeof paramProfileId === 'string' && profiles.some((profile) => profile.id === paramProfileId)
      ? paramProfileId
      : null) ??
    activeProfileId ??
    profiles[0]?.id ??
    null;

  const profileRecords = records.filter((record) => record.profileId === profileId);
  const profileName = profiles.find((profile) => profile.id === profileId)?.name;

  const defaultVaccineId =
    typeof initialVaccineId === 'string' && VACCINE_SCHEDULE.some((v) => v.id === initialVaccineId)
      ? initialVaccineId
      : VACCINE_SCHEDULE[0].id;

  const [selectedVaccineId, setSelectedVaccineId] = useState(defaultVaccineId);
  const existingRecord = profileRecords.find((record) => record.vaccineId === selectedVaccineId);
  const [administeredDate, setAdministeredDate] = useState(
    existingRecord?.administeredDate ?? todayKey,
  );
  const [provider, setProvider] = useState(existingRecord?.provider ?? '');
  const [notes, setNotes] = useState(existingRecord?.notes ?? '');

  const selectedVaccine = VACCINE_SCHEDULE.find((vaccine) => vaccine.id === selectedVaccineId)!;
  const monthLabel = monthRef.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const selectVaccine = (vaccineId: string) => {
    setSelectedVaccineId(vaccineId);
    const record = profileRecords.find((item) => item.vaccineId === vaccineId);
    setAdministeredDate(record?.administeredDate ?? todayKey);
    setProvider(record?.provider ?? '');
    setNotes(record?.notes ?? '');
  };

  if (!hydrated) {
    return <LoadingState title="Loading vaccine log…" />;
  }

  if (!profileId) {
    return (
      <MiniAppScreen>
        <MiniAppHero
          appId={APP_ID}
          eyebrow="Log vaccine"
          title="No child selected"
          subtitle="Add children in your Family profile before logging vaccines."
        />
        <MiniAppCta
          label="Open family"
          accent={theme.color}
          soft={theme.backgroundColor}
          onPress={() => router.replace('/(app)/family')}
        />
      </MiniAppScreen>
    );
  }

  return (
    <MiniAppScreen>
      <MiniAppHero
        appId={APP_ID}
        eyebrow="Log vaccine"
        title={profileName ?? 'Vaccine record'}
        subtitle={`Record a vaccine for ${profileName ?? 'this child'}. You can update or remove an existing entry.`}
      />

      <MiniAppCard index={1} title="Vaccine" eyebrow="Select" theme={theme}>
        <View style={styles.chipRow}>
          {VACCINE_SCHEDULE.map((vaccine) => {
            const selected = vaccine.id === selectedVaccineId;
            const completed = profileRecords.some((record) => record.vaccineId === vaccine.id);
            return (
              <MiniAppChip
                key={vaccine.id}
                label={`${vaccine.name} ${vaccine.doseLabel}${completed ? ' ✓' : ''}`}
                selected={selected}
                accent={theme.color}
                soft={theme.backgroundColor}
                onPress={() => selectVaccine(vaccine.id)}
              />
            );
          })}
        </View>
        <AppText variant="quickActionSubtitle">{selectedVaccine.description}</AppText>
        {existingRecord ? (
          <StatusPill
            label="Already logged"
            color={theme.color}
            background={theme.backgroundColor}
          />
        ) : null}
      </MiniAppCard>

      <MiniAppCard index={2} title={monthLabel} eyebrow="Administered date" theme={theme}>
        <View style={styles.monthHeader}>
          <Pressable
            hitSlop={12}
            onPress={() =>
              setMonthRef(new Date(monthRef.getFullYear(), monthRef.getMonth() - 1, 1))
            }
          >
            <ChevronLeft color={palette.textSecondary} size={20} />
          </Pressable>
          <AppText variant="caption" style={styles.muted}>
            Tap the date this vaccine was administered
          </AppText>
          <Pressable
            hitSlop={12}
            onPress={() =>
              setMonthRef(new Date(monthRef.getFullYear(), monthRef.getMonth() + 1, 1))
            }
          >
            <ChevronRight color={palette.textSecondary} size={20} />
          </Pressable>
        </View>

        <MonthCalendarGrid
          monthRef={monthRef}
          interactive
          accentColor={theme.color}
          onDayPress={setAdministeredDate}
          getDayState={(dayKey) => ({ selected: dayKey === administeredDate })}
        />

        {administeredDate ? (
          <AppText variant="body" style={styles.selectedDate}>
            Selected: {formatDisplayDate(administeredDate)}
          </AppText>
        ) : null}
      </MiniAppCard>

      <MiniAppCard index={3} title="Provider / clinic" eyebrow="Optional" theme={theme}>
        <Input
          value={provider}
          onChangeText={setProvider}
          placeholder="Optional"
          autoCapitalize="words"
        />
      </MiniAppCard>

      <MiniAppCard index={4} title="Notes" eyebrow="Details" theme={theme}>
        <Input value={notes} onChangeText={setNotes} placeholder="Batch number, reactions, etc." />
      </MiniAppCard>

      <View style={!administeredDate ? styles.ctaDisabled : undefined}>
        <MiniAppCta
          label={existingRecord ? 'Update record' : 'Save vaccine'}
          accent={theme.color}
          soft={theme.backgroundColor}
          index={5}
          onPress={() => {
            if (!administeredDate) {
              return;
            }
            upsertRecord({
              profileId,
              vaccineId: selectedVaccineId,
              administeredDate,
              provider: provider.trim() || undefined,
              notes: notes.trim() || undefined,
            });
            router.back();
          }}
        />
      </View>

      {existingRecord ? (
        <MiniAppCta
          label="Remove record"
          accent={theme.color}
          soft={theme.backgroundColor}
          secondary
          index={6}
          onPress={() => {
            removeRecord(profileId, selectedVaccineId);
            router.back();
          }}
        />
      ) : null}
    </MiniAppScreen>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  muted: {
    color: palette.textSecondary,
    flex: 1,
    textAlign: 'center',
  },
  selectedDate: {
    fontWeight: '600',
  },
  ctaDisabled: {
    opacity: 0.45,
  },
});
