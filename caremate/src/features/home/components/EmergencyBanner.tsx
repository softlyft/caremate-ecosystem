import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight, ShieldPlus } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { layoutSpacing, palette, radius, shadow } from '@/theme';

export function EmergencyBanner() {
  return (
    <Pressable
      style={[styles.wrapper, shadow.card]}
      onPress={() => router.push('/(app)/emergency/edit')}
    >
      <View style={styles.banner}>
        <View style={styles.iconWrap}>
          <ShieldPlus color="#FFFFFF" size={24} />
        </View>
        <View style={styles.copy}>
          <AppText variant="quickActionTitle" style={styles.title}>
            Protect yourself in an emergency
          </AppText>
          <AppText variant="quickActionSubtitle" style={styles.body}>
            Create your Emergency Health Profile and share vital information when it matters most.
          </AppText>
        </View>
        <View style={styles.cta}>
          <AppText variant="button" style={{ color: palette.brandPurple }}>
            Create
          </AppText>
          <ChevronRight color={palette.brandPurple} size={16} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: layoutSpacing.screenHorizontal,
    marginBottom: layoutSpacing.betweenSections,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  banner: {
    backgroundColor: palette.brandPurple,
    padding: layoutSpacing.cardPadding,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: '#FFFFFF',
  },
  body: {
    color: 'rgba(255,255,255,0.9)',
  },
  cta: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
