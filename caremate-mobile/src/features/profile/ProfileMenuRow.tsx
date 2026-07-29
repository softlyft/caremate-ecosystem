import { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Button, Card } from '@/components/ui/form-controls';
import { palette, radius } from '@/theme';

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
    <Button
      style={styles.row}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={title}
      variant="plain"
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
    </Button>
  );
}

type ProfileCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function ProfileCard({ children, style }: ProfileCardProps) {
  return <Card style={style}>{children}</Card>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
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
