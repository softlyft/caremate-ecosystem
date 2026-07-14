import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Minus, Plus } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import { MOOD_OPTIONS, SYMPTOM_OPTIONS } from '@/mini-apps/pregnancy-tracker/constants';
import {
  getTodayLog,
  usePregnancyTrackerHydrated,
  usePregnancyTrackerStore,
} from '@/mini-apps/pregnancy-tracker/store';
import { toDateKey } from '@/mini-apps/_kit/date-utils';
import { layoutSpacing, palette, radius, spacing } from '@/theme';

export default function PregnancyLogScreen() {
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
        Log how you&apos;re feeling today. This helps you spot patterns over time.
      </AppText>

      <View style={styles.card}>
        <AppText variant="cardTitle">Mood</AppText>
        <View style={styles.chipRow}>
          {MOOD_OPTIONS.map((option) => {
            const selected = mood === option;
            return (
              <Pressable
                key={option}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setMood(selected ? undefined : option)}
              >
                <AppText variant="caption" style={selected ? styles.chipTextSelected : undefined}>
                  {option}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <AppText variant="cardTitle">Symptoms</AppText>
        <View style={styles.chipRow}>
          {SYMPTOM_OPTIONS.map((option) => {
            const selected = symptoms.includes(option);
            return (
              <Pressable
                key={option}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => toggleSymptom(option)}
              >
                <AppText variant="caption" style={selected ? styles.chipTextSelected : undefined}>
                  {option}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <AppText variant="cardTitle">Baby kicks</AppText>
        <View style={styles.counterRow}>
          <Pressable
            style={styles.counterButton}
            onPress={() => setKickCount((count) => Math.max(0, count - 1))}
          >
            <Minus color={palette.textSecondary} size={18} />
          </Pressable>
          <AppText variant="screenTitle">{kickCount}</AppText>
          <Pressable
            style={styles.counterButton}
            onPress={() => setKickCount((count) => count + 1)}
          >
            <Plus color={palette.textSecondary} size={18} />
          </Pressable>
        </View>
        <AppText variant="caption" style={styles.muted}>
          Tap + each time you feel movement
        </AppText>
      </View>

      <View style={styles.card}>
        <AppText variant="cardTitle">Notes</AppText>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="How are you feeling? Any questions for your next visit?"
          multiline
          style={styles.notesInput}
          textAlignVertical="top"
        />
      </View>

      <Button
        label="Save log"
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.background,
  },
  content: {
    padding: layoutSpacing.screenHorizontal,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: layoutSpacing.cardPadding,
    gap: spacing.sm,
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
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  chipTextSelected: {
    color: '#0284C7',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  counterButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.divider,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.background,
  },
  notesInput: {
    minHeight: 110,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: spacing.md,
    backgroundColor: palette.background,
    fontSize: 15,
    color: palette.text,
  },
  muted: {
    color: palette.textSecondary,
    textAlign: 'center',
  },
});
