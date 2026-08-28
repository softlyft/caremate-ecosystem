import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { palette, spacing } from '@/theme';

export function DetailRow({
  label,
  value,
  children,
  style,
}: {
  label: string;
  value?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.row, style]}>
      <AppText variant="caption" style={styles.label}>
        {label}
      </AppText>
      {children ?? (
        <AppText variant="body" style={styles.value}>
          {value}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.divider,
    paddingVertical: spacing.sm,
  },
  label: {
    flexShrink: 0,
    maxWidth: '42%',
    color: palette.textSecondary,
  },
  value: {
    flex: 1,
    textAlign: 'right',
    fontWeight: '500',
  },
});
