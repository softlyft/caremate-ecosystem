import { StyleSheet, View } from 'react-native';
import { Lightbulb } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { getDailyHealthTip } from '@/features/home/utils/daily-health-tip';
import { layoutSpacing, palette, radius, shadow } from '@/theme';

interface DailyHealthTipProps {
  userKey?: string;
}

export function DailyHealthTip({ userKey = 'guest' }: DailyHealthTipProps) {
  const tip = getDailyHealthTip(userKey);

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Lightbulb color="#EAB308" fill="#FDE047" size={18} />
      </View>
      <View style={styles.content}>
        <AppText variant="caption" color="brand">
          {tip.emoji} {tip.categoryName} tip
        </AppText>
        <AppText variant="body">{tip.tip}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: layoutSpacing.screenHorizontal,
    marginBottom: layoutSpacing.betweenSections,
    backgroundColor: palette.primaryLight,
    borderRadius: radius.xl,
    padding: layoutSpacing.cardPadding,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    ...shadow.soft,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: palette.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
});
