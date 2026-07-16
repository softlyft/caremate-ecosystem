import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import {
  MiniAppCard,
  MiniAppChip,
  MiniAppCta,
  MiniAppHero,
  MiniAppScreen,
  getMiniAppTheme,
} from '@/mini-apps/_kit';
import { MOOD_OPTIONS, SYMPTOM_OPTIONS } from '@/mini-apps/pregnancy-tracker/constants';
import {
  getTodayLog,
  usePregnancyTrackerHydrated,
  usePregnancyTrackerStore,
} from '@/mini-apps/pregnancy-tracker/store';
import { toDateKey } from '@/mini-apps/_kit/date-utils';
import { palette, radius, spacing } from '@/theme';

const APP_ID = 'pregnancy-tracker' as const;

export default function PregnancyLogScreen() {
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
        eyebrow="Daily log"
        title="How are you feeling?"
        subtitle="Log how you're feeling today. This helps you spot patterns over time."
      />

      <MiniAppCard index={1} title="Mood" theme={theme}>
        <View style={styles.chipRow}>
          {MOOD_OPTIONS.map((option) => (
            <MiniAppChip
              key={option}
              label={option}
              selected={mood === option}
              accent={theme.color}
              soft={theme.backgroundColor}
              onPress={() => setMood(mood === option ? undefined : option)}
            />
          ))}
        </View>
      </MiniAppCard>

      <MiniAppCard index={2} title="Symptoms" theme={theme}>
        <View style={styles.chipRow}>
          {SYMPTOM_OPTIONS.map((option) => (
            <MiniAppChip
              key={option}
              label={option}
              selected={symptoms.includes(option)}
              accent={theme.color}
              soft={theme.backgroundColor}
              onPress={() => toggleSymptom(option)}
            />
          ))}
        </View>
      </MiniAppCard>

      <MiniAppCard index={3} title="Baby kicks" theme={theme}>
        <View style={styles.counterRow}>
          <Pressable
            style={[styles.counterButton, { borderColor: theme.color }]}
            onPress={() => setKickCount((count) => Math.max(0, count - 1))}
          >
            <Minus color={theme.color} size={18} />
          </Pressable>
          <AppText variant="screenTitle" style={{ color: theme.titleColor }}>
            {kickCount}
          </AppText>
          <Pressable
            style={[styles.counterButton, { borderColor: theme.color }]}
            onPress={() => setKickCount((count) => count + 1)}
          >
            <Plus color={theme.color} size={18} />
          </Pressable>
        </View>
        <AppText variant="caption" style={styles.muted}>
          Tap + each time you feel movement
        </AppText>
      </MiniAppCard>

      <MiniAppCard index={4} title="Notes" theme={theme}>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="How are you feeling? Any questions for your next visit?"
          multiline
          style={styles.notesInput}
          textAlignVertical="top"
          placeholderTextColor={palette.textSecondary}
        />
      </MiniAppCard>

      <MiniAppCta
        label="Save log"
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
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: spacing.md,
    backgroundColor: palette.surface,
    fontSize: 15,
    color: palette.text,
  },
  muted: {
    color: palette.textSecondary,
    textAlign: 'center',
  },
});
