import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { Button, Input } from '@/components/ui/form-controls';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/domains/localization';
import {
  MiniAppCard,
  MiniAppChip,
  MiniAppCta,
  MiniAppHero,
  MiniAppScreen,
  getMiniAppTheme,
} from '@/mini-apps/_kit';
import {
  getTodayLog,
  usePregnancyTrackerHydrated,
  usePregnancyTrackerStore,
} from '@/mini-apps/pregnancy-tracker/store';
import {
  localizeMoodOptions,
  localizeSymptomOptions,
} from '@/mini-apps/pregnancy-tracker/localize';
import { toDateKey } from '@/mini-apps/_kit/date-utils';
import { palette, radius, spacing } from '@/theme';

const APP_ID = 'pregnancy-tracker' as const;

export default function PregnancyLogScreen() {
  const { t } = useTranslation();
  const theme = getMiniAppTheme(APP_ID);
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const hydrated = usePregnancyTrackerHydrated();

  const existingLog = usePregnancyTrackerStore((state) => state.dailyLogs[todayKey]);
  const upsertDailyLog = usePregnancyTrackerStore((state) => state.upsertDailyLog);

  const [mood, setMood] = useState(existingLog?.mood);
  const [symptoms, setSymptoms] = useState<string[]>(existingLog?.symptoms ?? []);
  const [kickCount, setKickCount] = useState(existingLog?.kickCount ?? 0);
  const [notes, setNotes] = useState(existingLog?.notes ?? '');

  const toggleSymptom = (symptom: string) => {
    setSymptoms((current) =>
      current.includes(symptom)
        ? current.filter((item) => item !== symptom)
        : [...current, symptom],
    );
  };

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.color} />
      </View>
    );
  }

  return (
    <MiniAppScreen>
      <MiniAppHero
        appId={APP_ID}
        eyebrow={t('apps.pregnancy.ui.dailyLog')}
        title={t('apps.pregnancy.ui.howFeeling')}
        subtitle={t('apps.pregnancy.ui.howFeelingSubtitle')}
      />

      <MiniAppCard index={1} title={t('apps.pregnancy.ui.mood')} theme={theme}>
        <View style={styles.chipRow}>
          {localizeMoodOptions(t).map((option) => (
            <MiniAppChip
              key={option.id}
              label={option.label}
              selected={mood === option.id}
              accent={theme.color}
              soft={theme.backgroundColor}
              onPress={() => setMood(mood === option.id ? undefined : option.id)}
            />
          ))}
        </View>
      </MiniAppCard>

      <MiniAppCard index={2} title={t('apps.pregnancy.ui.symptoms')} theme={theme}>
        <View style={styles.chipRow}>
          {localizeSymptomOptions(t).map((option) => (
            <MiniAppChip
              key={option.id}
              label={option.label}
              selected={symptoms.includes(option.id)}
              accent={theme.color}
              soft={theme.backgroundColor}
              onPress={() => toggleSymptom(option.id)}
            />
          ))}
        </View>
      </MiniAppCard>

      <MiniAppCard index={3} title={t('apps.pregnancy.ui.babyKicks')} theme={theme}>
        <View style={styles.counterRow}>
          <Button
            style={[styles.counterButton, { borderColor: theme.color }]}
            onPress={() => setKickCount((count) => Math.max(0, count - 1))}
            variant="plain"
          >
            <Minus color={theme.color} size={18} />
          </Button>
          <AppText variant="screenTitle" style={{ color: theme.titleColor }}>
            {kickCount}
          </AppText>
          <Button
            style={[styles.counterButton, { borderColor: theme.color }]}
            onPress={() => setKickCount((count) => count + 1)}
            variant="plain"
          >
            <Plus color={theme.color} size={18} />
          </Button>
        </View>
        <AppText variant="caption" style={styles.muted}>
          {t('apps.pregnancy.ui.tapKickHint')}
        </AppText>
      </MiniAppCard>

      <MiniAppCard index={4} title={t('apps.pregnancy.ui.notes')} theme={theme}>
        <Input
          value={notes}
          onChangeText={setNotes}
          placeholder={t('apps.pregnancy.ui.notesPlaceholder')}
          multiline
          style={styles.notesInput}
          textAlignVertical="top"
        />
      </MiniAppCard>

      <MiniAppCta
        label={t('apps.pregnancyTracker.saveLog')}
        accent={theme.color}
        soft={theme.backgroundColor}
        index={5}
        onPress={() => {
          upsertDailyLog({
            ...getTodayLog(todayKey),
            mood,
            symptoms,
            kickCount,
            notes: notes.trim(),
          });
          router.back();
        }}
      />
    </MiniAppScreen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  counterButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.background,
  },
  notesInput: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  muted: {
    color: palette.textSecondary,
    textAlign: 'center',
  },
});
