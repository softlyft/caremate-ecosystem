import { router } from 'expo-router';
import { LayoutGrid } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableFlatList, {
  type RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/form-controls';

import { AnimatedSection } from '@/components/motion/AnimatedSection';
import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/domains/localization';
import { MiniAppCard } from '@/mini-apps/_kit/MiniAppCard';
import { loadMiniAppsOrder, saveMiniAppsOrder } from '@/mini-apps/_kit/order-preference';
import { MINI_APPS, type MiniAppDefinition } from '@/mini-apps/_kit/registry';
import { useIsGuest } from '@/hooks/use-current-user-id';
import { layoutSpacing, palette, radius, spacing } from '@/theme';

export default function AppsTabScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isGuest = useIsGuest();
  const [apps, setApps] = useState<MiniAppDefinition[]>(MINI_APPS);
  const [orderReady, setOrderReady] = useState(false);
  const availableCount = apps.filter((app) => app.available).length;

  useEffect(() => {
    let active = true;
    void (async () => {
      const ordered = await loadMiniAppsOrder();
      if (active) {
        setApps(ordered);
        setOrderReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const renderItem = useCallback(
    ({ item, getIndex, drag, isActive }: RenderItemParams<MiniAppDefinition>) => (
      <ScaleDecorator activeScale={1.03}>
        <View style={styles.cardSlot}>
          <MiniAppCard
            app={item}
            index={getIndex() ?? 0}
            onLongPress={drag}
            isDragging={isActive}
          />
        </View>
      </ScaleDecorator>
    ),
    [],
  );

  return (
    <GestureHandlerRootView style={styles.screen}>
      <DraggableFlatList
        data={apps}
        keyExtractor={(item) => item.id}
        onDragEnd={({ data }) => {
          setApps(data);
          void saveMiniAppsOrder(data.map((app) => app.id));
        }}
        renderItem={renderItem}
        activationDistance={12}
        containerStyle={styles.screen}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <AnimatedSection index={0}>
              <View style={styles.hero}>
                <View style={styles.meshTop} />
                <View style={styles.meshAccent} />

                <View style={styles.heroBadge}>
                  <LayoutGrid color={palette.primary} size={16} strokeWidth={2.25} />
                  <AppText variant="caption" color="brand" style={styles.heroBadgeLabel}>
                    {t('apps.readyCount', { count: availableCount })}
                  </AppText>
                </View>

                <AppText variant="screenTitle" style={styles.title}>
                  {t('apps.title')}
                </AppText>
                <AppText variant="subtitle" style={styles.subtitle}>
                  {t('apps.subtitle')}
                </AppText>
                {orderReady ? (
                  <AppText variant="caption" style={styles.reorderHint}>
                    {t('apps.reorderHint')}
                  </AppText>
                ) : null}
              </View>
            </AnimatedSection>

            {isGuest ? (
              <AnimatedSection index={1}>
                <View style={styles.guestBanner}>
                  <AppText variant="cardTitle">{t('apps.signInRequiredTitle')}</AppText>
                  <AppText variant="quickActionSubtitle" style={styles.guestBannerText}>
                    {t('profile.premium.appsGuestBanner')}
                  </AppText>
                  <Button
                    style={styles.guestCta}
                    onPress={() => router.push('/(auth)/login')}
                    variant="plain"
                  >
                    <AppText variant="caption" style={styles.guestCtaLabel}>
                      {t('common.signIn')}
                    </AppText>
                  </Button>
                </View>
              </AnimatedSection>
            ) : null}
          </View>
        }
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  content: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingBottom: 40,
  },
  header: {
    gap: layoutSpacing.sectionTitleToContent,
    marginBottom: spacing.sm,
  },
  cardSlot: {
    marginBottom: spacing.sm,
  },
  hero: {
    position: 'relative',
    overflow: 'hidden',
    gap: layoutSpacing.welcomeToSubtitle,
  },
  meshTop: {
    position: 'absolute',
    top: -70,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: palette.primaryLight,
    opacity: 0.55,
  },
  meshAccent: {
    position: 'absolute',
    top: 30,
    left: -60,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#E0F2FE',
    opacity: 0.5,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.background,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.14)',
    zIndex: 1,
  },
  heroBadgeLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontSize: 11,
  },
  title: {
    zIndex: 1,
    letterSpacing: -0.6,
  },
  subtitle: {
    zIndex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: palette.textSecondary,
    maxWidth: '95%',
  },
  reorderHint: {
    zIndex: 1,
    color: palette.textSecondary,
    opacity: 0.9,
  },
  guestBanner: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.18)',
    backgroundColor: palette.primaryLight,
    padding: layoutSpacing.cardPadding,
    gap: spacing.sm,
  },
  guestBannerText: {
    color: palette.textSecondary,
  },
  guestCta: {
    alignSelf: 'flex-start',
    backgroundColor: palette.primary,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  guestCtaLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
