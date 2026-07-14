import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BadgeCheck, Building2, Star } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import type { Provider } from '@/types';
import { layoutSpacing, palette, radius, shadow } from '@/theme';

interface NearbyProvidersRowProps {
  providers: Provider[];
}

export function NearbyProvidersRow({ providers }: NearbyProvidersRowProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText variant="sectionTitle">Healthcare Near You</AppText>
        <Pressable onPress={() => router.push('/(app)/(tabs)/providers')}>
          <AppText variant="seeAll">See All</AppText>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {providers.map((provider, index) => (
          <Pressable
            key={provider.id}
            style={[styles.card, shadow.soft]}
            onPress={() => router.push(`/(app)/providers/${provider.id}`)}
          >
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: index % 2 === 0 ? palette.blueLight : palette.primaryLight },
              ]}
            >
              <Building2 color={index % 2 === 0 ? palette.blueAccent : palette.primary} size={22} />
            </View>
            <AppText variant="providerName" numberOfLines={2}>
              {provider.name}
            </AppText>
            <View style={styles.metaRow}>
              <Star color={palette.warning} size={14} fill={palette.warning} />
              <AppText variant="providerMeta">4.{8 - (index % 3)}</AppText>
              <AppText variant="providerMeta">
                · {provider.distanceKm?.toFixed(1) ?? '—'} km
              </AppText>
            </View>
            <View style={styles.verified}>
              <BadgeCheck color={palette.primary} size={14} />
              <AppText variant="providerMeta" color="brand">
                Verified
              </AppText>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: layoutSpacing.betweenSections,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: layoutSpacing.screenHorizontal,
    marginBottom: layoutSpacing.sectionTitleToContent,
  },
  row: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    gap: 12,
  },
  card: {
    width: 180,
    backgroundColor: palette.background,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: layoutSpacing.cardPadding,
    gap: 8,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
