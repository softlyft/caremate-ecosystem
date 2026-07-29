import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Clock } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/form-controls';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/domains/localization';
import { dateToHhMm, hhMmToDate, isValidHhMm } from '@/mini-apps/medication-tracker/utils';
import { palette, radius, spacing } from '@/theme';

type DoseTimePickerProps = {
  label: string;
  value: string;
  onChange: (next: string) => void;
  accent: string;
  soft: string;
};

/**
 * Read-only dose time field that opens a native clock / spinner.
 * Values are always stored as validated `HH:mm` — no free-text entry.
 */
export function DoseTimePicker({ label, value, onChange, accent, soft }: DoseTimePickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const safeValue = isValidHhMm(value) ? value.trim() : '08:00';
  const pickerDate = useMemo(() => hhMmToDate(safeValue), [safeValue]);
  const useDialog = Platform.OS === 'android';

  const commit = (next: Date | undefined) => {
    if (!next) return;
    onChange(dateToHhMm(next));
  };

  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (useDialog) {
      setOpen(false);
    }
    if (event.type === 'dismissed') {
      return;
    }
    commit(selected);
  };

  return (
    <View style={styles.wrap}>
      <AppText variant="caption" style={styles.label}>
        {label}
      </AppText>
      <Button
        accessibilityRole="button"
        accessibilityLabel={t('apps.medication.ui.scheduleTimeA11y', {
          label,
          time: safeValue,
        })}
        onPress={() => setOpen(true)}
        style={[styles.field, { borderColor: `${accent}44`, backgroundColor: soft }]}
        variant="plain"
      >
        <Clock color={accent} size={18} strokeWidth={2.25} />
        <AppText variant="body" style={styles.timeText}>
          {safeValue}
        </AppText>
        <AppText variant="caption" style={styles.changeHint}>
          {t('apps.medication.ui.scheduleTimeChange')}
        </AppText>
      </Button>

      {open && useDialog ? (
        <DateTimePicker
          value={pickerDate}
          mode="time"
          display="default"
          is24Hour
          onChange={onPickerChange}
        />
      ) : null}

      {!useDialog ? (
        <Modal
          visible={open}
          transparent
          animationType="fade"
          onRequestClose={() => setOpen(false)}
        >
          <View style={styles.backdrop}>
            <Pressable
              accessibilityLabel={t('common.cancel')}
              onPress={() => setOpen(false)}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.sheet}>
              <View style={styles.sheetHeader}>
                <AppText variant="cardTitle">{label}</AppText>
                <Button
                  accessibilityLabel={t('common.done')}
                  onPress={() => setOpen(false)}
                  style={[styles.doneButton, { backgroundColor: soft }]}
                  variant="plain"
                >
                  <AppText variant="button" style={{ color: accent }}>
                    {t('common.done')}
                  </AppText>
                </Button>
              </View>
              <DateTimePicker
                value={pickerDate}
                mode="time"
                display="spinner"
                is24Hour
                onChange={onPickerChange}
                style={styles.iosPicker}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  label: {
    color: palette.textSecondary,
  },
  field: {
    minHeight: 48,
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeText: {
    flex: 1,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  changeHint: {
    color: palette.textSecondary,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: palette.background,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  doneButton: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iosPicker: {
    alignSelf: 'stretch',
  },
});
