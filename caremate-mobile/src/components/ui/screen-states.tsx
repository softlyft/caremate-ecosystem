import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { BrandLoader } from '@/components/ui/BrandLoader';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import { layoutSpacing, palette, radius, spacing } from '@/theme';

interface ScreenStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function LoadingState({ title }: { title?: string }) {
  return (
    <View style={styles.loading}>
      <BrandLoader size="lg" />
      {title ? (
        <AppText variant="quickActionSubtitle" style={styles.loadingTitle}>
          {title}
        </AppText>
      ) : null}
    </View>
  );
}

export function EmptyState({ title, message, actionLabel, onAction }: ScreenStateProps) {
  return (
    <View style={styles.state}>
      <AppText variant="cardTitle" style={styles.stateTitle}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="quickActionSubtitle" style={styles.stateMessage}>
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

export function ErrorState({ title, message, actionLabel, onAction }: ScreenStateProps) {
  return (
    <View style={styles.state}>
      <AppText variant="cardTitle" style={styles.errorTitle}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="quickActionSubtitle" style={styles.stateMessage}>
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

export function Screen({
  children,
  padded = true,
  tone = 'surface',
  style,
}: PropsWithChildren<{
  padded?: boolean;
  tone?: 'background' | 'surface';
  style?: StyleProp<ViewStyle>;
}>) {
  return (
    <View
      style={[
        styles.screen,
        tone === 'background' ? styles.toneBackground : styles.toneSurface,
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function StateCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.stateCard, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: palette.surface,
  },
  loadingTitle: {
    textAlign: 'center',
    color: palette.textSecondary,
    maxWidth: 260,
  },
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  stateTitle: {
    textAlign: 'center',
  },
  stateMessage: {
    textAlign: 'center',
    color: palette.textSecondary,
  },
  errorTitle: {
    textAlign: 'center',
    color: palette.danger,
  },
  screen: {
    flex: 1,
  },
  toneBackground: {
    backgroundColor: palette.background,
  },
  toneSurface: {
    backgroundColor: palette.surface,
  },
  padded: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  stateCard: {
    backgroundColor: palette.background,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: spacing.md,
    gap: spacing.sm,
  },
});
