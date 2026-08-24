import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { CalendarDays } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import { useTranslation } from '@/domains/localization';
import { todayDateKey } from '@/domains/timeline/consent-window';
import { formatTimelineDateKey, parseTimelineDateKey } from '@/features/timeline/format';
import { palette, radius, spacing } from '@/theme';

const ACCENT = '#4338CA';
const SOFT = '#EEF2FF';

type TimelineDatePickerProps = {
  label: string;
  value: string;
  onChange: (next: string) => void;
};

export function TimelineDatePicker({ label, value, onChange }: TimelineDatePickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const pickerDate = useMemo(() => parseTimelineDateKey(value || todayDateKey()), [value]);
  const useDialog = Platform.OS === 'android';

  const commit = (next: Date | undefined) => {
    if (!next) return;
    const year = next.getFullYear();
    const month = String(next.getMonth() + 1).padStart(2, '0');
    const day = String(next.getDate()).padStart(2, '0');
    onChange(`${year}-${month}-${day}`);
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
        accessibilityLabel={`${label}, ${formatTimelineDateKey(value)}`}
        onPress={() => setOpen(true)}
        style={styles.field}
        variant="plain"
      >
        <CalendarDays color={ACCENT} size={16} strokeWidth={2.2} />
        <AppText variant="body" style={styles.value} numberOfLines={1}>
          {formatTimelineDateKey(value)}
        </AppText>
      </Button>

      {open && useDialog ? (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="default"
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
                  style={styles.doneButton}
                  variant="plain"
                >
                  <AppText variant="button" style={{ color: ACCENT }}>
                    {t('common.done')}
                  </AppText>
                </Button>
              </View>
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display="spinner"
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
    flex: 1,
    gap: 4,
  },
  label: {
    color: palette.textSecondary,
    fontWeight: '600',
  },
  field: {
    minHeight: 44,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(67, 56, 202, 0.22)',
    backgroundColor: SOFT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  value: {
    flex: 1,
    fontWeight: '600',
    color: ACCENT,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: palette.background,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  doneButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: SOFT,
  },
  iosPicker: {
    height: 196,
  },
});
