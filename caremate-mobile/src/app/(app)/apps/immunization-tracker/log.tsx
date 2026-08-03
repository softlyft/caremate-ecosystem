import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Input } from '@/components/ui/form-controls';
import { LoadingState } from '@/components/ui/screen-states';
import { useTranslation } from '@/domains/localization';
import { VACCINE_SCHEDULE } from '@/mini-apps/immunization-tracker/constants';
import {
  useImmunizationTrackerHydrated,
  useImmunizationTrackerStore,
} from '@/mini-apps/immunization-tracker/store';
import { formatDisplayDate, toDateKey } from '@/mini-apps/immunization-tracker/utils';
import { localizeVaccine } from '@/mini-apps/immunization-tracker/localize';
import {
  assessImmunizationRecordDraft,
  type ImmunizationIssue,
} from '@/mini-apps/immunization-tracker/validation';
import {
  MiniAppCard,
  MiniAppChip,
  MiniAppCta,
  MiniAppHero,
  MiniAppScreen,
  MonthCalendarGrid,
  MonthCalendarNavigator,
  StatusPill,
  getMiniAppTheme,
} from '@/mini-apps/_kit';
import { palette, spacing } from '@/theme';

const APP_ID = 'immunization-tracker' as const;

export default function ImmunizationLogScreen() {
  const { t } = useTranslation();
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

  const profile = profiles.find((item) => item.id === profileId);
  const profileRecords = records.filter((record) => record.profileId === profileId);
  const profileName = profile?.name;

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

  const selectedVaccine = localizeVaccine(
    VACCINE_SCHEDULE.find((vaccine) => vaccine.id === selectedVaccineId)!,
    t,
  );
  const selectVaccine = (vaccineId: string) => {
    setSelectedVaccineId(vaccineId);
    const record = profileRecords.find((item) => item.vaccineId === vaccineId);
    setAdministeredDate(record?.administeredDate ?? todayKey);
    setProvider(record?.provider ?? '');
    setNotes(record?.notes ?? '');
  };

  const issueMessage = (issue: ImmunizationIssue): string =>
    t(`apps.immunization.validation.${issue.messageKey}`, issue.params ?? {});

  const commitRecord = () => {
    const assessment = assessImmunizationRecordDraft({
      profile,
      vaccineId: selectedVaccineId,
      administeredDate,
      provider,
      notes,
      todayKey,
      records: profileRecords,
    });

    if (assessment.hard) {
      Alert.alert(t('apps.immunization.validation.checkTitle'), issueMessage(assessment.hard));
      return;
    }

    if (!assessment.payload) {
      Alert.alert(
        t('apps.immunization.validation.checkTitle'),
        t('apps.immunization.validation.unusualCheck'),
      );
      return;
    }

    const save = () => {
      upsertRecord(assessment.payload!);
      router.back();
    };

    if (assessment.soft.length > 0) {
      Alert.alert(
        t('apps.immunization.validation.confirmTitle'),
        assessment.soft.map(issueMessage).join('\n\n'),
        [
          { text: t('apps.immunization.validation.cancel'), style: 'cancel' },
          { text: t('apps.immunization.validation.saveAnyway'), onPress: save },
        ],
      );
      return;
    }

    save();
  };

  if (!hydrated) {
    return <LoadingState title={t('apps.immunizationTracker.loadingLog')} />;
  }

  if (!profileId) {
    return (
      <MiniAppScreen>
        <MiniAppHero
          appId={APP_ID}
          eyebrow={t('apps.immunizationTracker.logVaccine')}
          title={t('apps.immunizationTracker.noChildSelected')}
          subtitle={t('apps.immunizationTracker.noChildSubtitle')}
        />
        <MiniAppCta
          label={t('apps.openFamily')}
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
        eyebrow={t('apps.immunizationTracker.logVaccine')}
        title={profileName ?? t('apps.immunization.ui.vaccineRecordTitle')}
        subtitle={t('apps.immunization.ui.logIntro')}
      />

      <MiniAppCard
        index={1}
        title={t('apps.immunization.ui.vaccine')}
        eyebrow={t('apps.immunization.ui.select')}
        theme={theme}
      >
        <View style={styles.chipRow}>
          {VACCINE_SCHEDULE.map((vaccine) => {
            const selected = vaccine.id === selectedVaccineId;
            const completed = profileRecords.some((record) => record.vaccineId === vaccine.id);
            const localized = localizeVaccine(vaccine, t);
            return (
              <MiniAppChip
                key={vaccine.id}
                label={`${localized.name} ${localized.doseLabel}${completed ? ' ✓' : ''}`}
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
            label={t('apps.immunization.ui.alreadyLoggedPill')}
            color={theme.color}
            background={theme.backgroundColor}
          />
        ) : null}
      </MiniAppCard>

      <MiniAppCard index={2} eyebrow={t('apps.immunization.ui.administeredDate')} theme={theme}>
        <MonthCalendarNavigator
          accentColor={theme.color}
          monthRef={monthRef}
          onMonthChange={setMonthRef}
          subtitle={t('apps.immunization.ui.tapAdministeredDate')}
        />

        <MonthCalendarGrid
          monthRef={monthRef}
          interactive
          accentColor={theme.color}
          onDayPress={setAdministeredDate}
          getDayState={(dayKey) => ({ selected: dayKey === administeredDate })}
        />

        {administeredDate ? (
          <AppText variant="body" style={styles.selectedDate}>
            {t('apps.immunization.ui.selectedDate', { date: formatDisplayDate(administeredDate) })}
          </AppText>
        ) : null}
      </MiniAppCard>

      <MiniAppCard
        index={3}
        title={t('apps.immunization.ui.providerOptional')}
        eyebrow={t('apps.immunization.ui.optional')}
        theme={theme}
      >
        <Input
          value={provider}
          onChangeText={setProvider}
          placeholder={t('apps.immunization.ui.optional')}
          autoCapitalize="words"
        />
      </MiniAppCard>

      <MiniAppCard
        index={4}
        title={t('apps.immunization.ui.notes')}
        eyebrow={t('apps.immunization.ui.details')}
        theme={theme}
      >
        <Input
          value={notes}
          onChangeText={setNotes}
          placeholder={t('apps.immunization.ui.notesPlaceholder')}
        />
      </MiniAppCard>

      <MiniAppCta
        label={
          existingRecord
            ? t('apps.immunizationTracker.updateRecord')
            : t('apps.immunizationTracker.saveVaccine')
        }
        accent={theme.color}
        soft={theme.backgroundColor}
        index={5}
        onPress={commitRecord}
      />

      {existingRecord ? (
        <MiniAppCta
          label={t('apps.immunization.ui.removeRecord')}
          accent={theme.color}
          soft={theme.backgroundColor}
          secondary
          index={6}
          onPress={() => {
            Alert.alert(
              t('apps.immunization.validation.undoTitle'),
              t('apps.immunization.validation.undoMessage'),
              [
                { text: t('apps.immunization.validation.cancel'), style: 'cancel' },
                {
                  text: t('apps.immunization.validation.undoConfirm'),
                  style: 'destructive',
                  onPress: () => {
                    removeRecord(profileId, selectedVaccineId);
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  selectedDate: {
    fontWeight: '600',
  },
});
