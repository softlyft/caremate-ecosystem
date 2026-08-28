import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { palette, radius, spacing } from '@/theme';

export function FormNotice({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.notice, style]}>
      {typeof children === 'string' ? (
        <AppText variant="caption" style={styles.text}>
          {children}
        </AppText>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.divider,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  text: {
    color: palette.textSecondary,
  },
});
