import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { palette, spacing } from '@/theme';

export function FormField({
  label,
  hint,
  error,
  children,
  style,
  compact = false,
  labelExtra,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  labelExtra?: ReactNode;
}) {
  return (
    <View style={[compact ? styles.compact : styles.field, style]}>
      {label || labelExtra ? (
        <View style={styles.labelRow}>
          {label ? <AppText variant="caption">{label}</AppText> : null}
          {labelExtra}
        </View>
      ) : null}
      {children}
      {error ? (
        <AppText variant="formError" color={palette.danger}>
          {error}
        </AppText>
      ) : null}
      {!error && hint ? (
        <AppText variant="caption" style={styles.hint}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

export function FormStack({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.stack, style]}>{children}</View>;
}

export function FormActions({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.actions, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.sm,
  },
  compact: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  hint: {
    color: palette.textSecondary,
  },
  stack: {
    gap: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});
