import { Lock } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { UpgradePrompt } from '@/features/premium/UpgradePrompt';
import { radius } from '@/theme';

type PremiumLockedOverlayProps = {
  locked: boolean;
  title: string;
  message: string;
  children: ReactNode;
};

export function PremiumLockedOverlay({
  locked,
  title,
  message,
  children,
}: PremiumLockedOverlayProps) {
  if (!locked) {
    return <>{children}</>;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.dimmed} pointerEvents="none">
        {children}
      </View>
      <View style={styles.overlay}>
        <View style={styles.lockBadge}>
          <Lock color="#92400E" size={18} strokeWidth={2.25} />
        </View>
        <AppText variant="caption" style={styles.lockedLabel}>
          {title}
        </AppText>
        <UpgradePrompt title={title} message={message} compact />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  dimmed: {
    opacity: 0.28,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    padding: 12,
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
  },
  lockBadge: {
    alignSelf: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedLabel: {
    textAlign: 'center',
    color: '#92400E',
    fontWeight: '600',
  },
});
