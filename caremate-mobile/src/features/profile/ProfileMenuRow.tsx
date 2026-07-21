import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';

import { PressableScale } from '@/components/motion/PressableScale';
import { AppText } from '@/components/ui/AppText';
import { layoutSpacing, palette, radius, shadow } from '@/theme';

type ProfileMenuRowProps = {
  icon: LucideIcon;
  iconColor?: string;
  iconBackground?: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  trailing?: ReactNode;
  disabled?: boolean;
};

export function ProfileMenuRow({
  icon: Icon,
  iconColor = palette.primary,
  iconBackground = palette.primaryLight,
  title,
  subtitle,
  onPress,
  trailing,
  disabled,
}: ProfileMenuRowProps) {
  return (
    <PressableScale
      style={[styles.row, disabled ? styles.disabled : null]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconBackground }]}>
        <Icon color={iconColor} size={20} strokeWidth={2.25} />
      </View>
      <View style={styles.copy}>
        <AppText variant="body" style={styles.title}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing ?? <ChevronRight color={palette.textSecondary} size={18} strokeWidth={2.25} />}
    </PressableScale>
  );
}

type ProfileCardProps = {
  children: ReactNode;
  style?: object;
};

export function ProfileCard({ children, style }: ProfileCardProps) {
  return <View style={[styles.card, shadow.soft, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.background,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: layoutSpacing.cardPadding,
    gap: 4,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  disabled: {
    opacity: 0.55,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: palette.textSecondary,
  },
});
