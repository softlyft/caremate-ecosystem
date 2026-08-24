import { type ReactNode } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';

import { alert, confirm, useAppDialogStore } from '@/components/ui/app-dialog';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import { layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

export { alert, confirm, useAppDialogStore };
export type {
  AppDialogAction,
  AppDialogAlertButton,
  AppDialogConfirmOptions,
} from '@/components/ui/app-dialog';

function DialogLayer({
  children,
  onRequestClose,
}: {
  children: ReactNode;
  onRequestClose: () => void;
}) {
  if (Platform.OS === 'ios') {
    return (
      <FullWindowOverlay>
        <View style={styles.overlayRoot}>{children}</View>
      </FullWindowOverlay>
    );
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={onRequestClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible
    >
      {children}
    </Modal>
  );
}

/**
 * Root host for branded alerts/confirms. Mount once under GluestackUIProvider.
 * iOS uses a native-stack overlay so dialogs paint above mini-app screens.
 */
export function AppDialogHost() {
  const current = useAppDialogStore((state) => state.current);
  const complete = useAppDialogStore((state) => state.complete);

  const cancelAction =
    current?.actions.find((action) => action.result === false) ??
    current?.actions.find((action) => action.variant === 'secondary') ??
    null;

  const handleAction = (index: number) => {
    if (!current) {
      return;
    }
    const action = current.actions[index];
    if (!action) {
      return;
    }
    action.onPress?.();
    complete(action.result);
  };

  const dismiss = () => {
    if (!current) {
      return;
    }
    if (cancelAction) {
      cancelAction.onPress?.();
      complete(cancelAction.result ?? false);
      return;
    }
    const only = current.actions[0];
    only?.onPress?.();
    complete(only?.result);
  };

  if (!current) {
    return null;
  }

  return (
    <DialogLayer onRequestClose={dismiss}>
      <View accessibilityViewIsModal style={styles.backdrop}>
        <Pressable accessibilityLabel="Dismiss" onPress={dismiss} style={StyleSheet.absoluteFill} />
        <View accessibilityRole="alert" style={[styles.card, shadow.card]}>
          <AppText variant="sectionTitle" style={styles.title}>
            {current.title}
          </AppText>
          {current.message ? (
            <AppText variant="body" style={styles.message}>
              {current.message}
            </AppText>
          ) : null}
          <View style={styles.actions}>
            {current.actions.map((action, index) => (
              <Button
                key={`${current.id}-${action.label}-${index}`}
                label={action.label}
                onPress={() => handleAction(index)}
                size="sm"
                style={styles.actionButton}
                variant={
                  action.variant ?? (index === current.actions.length - 1 ? 'primary' : 'secondary')
                }
              />
            ))}
          </View>
        </View>
      </View>
    </DialogLayer>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    paddingHorizontal: layoutSpacing.screenHorizontal,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    color: palette.text,
  },
  message: {
    color: palette.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionButton: {
    minWidth: 96,
  },
});
