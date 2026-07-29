import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ShieldAlert } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/form-controls';

import { AppText } from '@/components/ui/AppText';
import { LoadingState } from '@/components/ui/screen-states';
import { syncEmergencyLockSurface } from '@/domains/emergency/lock-surface';
import { useTranslation } from '@/domains/localization';
import { layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

/**
 * Legacy deep link `caremate://emergency-lock`.
 * Lock/home widgets no longer show PHI — point users to Patient ID QR instead.
 */
export default function EmergencyLockScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const clearQuery = useQuery({
    queryKey: ['emergency-lock-clear'],
    queryFn: async () => {
      await syncEmergencyLockSurface(null);
      return true;
    },
  });

  if (clearQuery.isLoading) {
    return <LoadingState title={t('emergency.lock.loading')} />;
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <ShieldAlert color={palette.primary} size={20} strokeWidth={2.25} />
          </View>
          <View style={styles.headerCopy}>
            <AppText variant="caption" color="brand" style={styles.eyebrow}>
              {t('emergency.lock.badge')}
            </AppText>
            <AppText variant="cardTitle" style={styles.headerTitle}>
              {t('emergency.lock.retiredTitle')}
            </AppText>
          </View>
        </View>

        <AppText variant="subtitle" style={styles.help}>
          {t('emergency.lock.retiredHelp')}
        </AppText>

        <View style={[styles.card, shadow.soft]}>
          <AppText variant="body">{t('emergency.lock.retiredBody')}</AppText>
        </View>

        <Button
          label={t('emergency.lock.openPatientId')}
          style={styles.cta}
          onPress={() => router.replace('/(app)/(tabs)/profile')}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  content: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primaryLight,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  headerTitle: {
    color: palette.text,
  },
  help: {
    color: palette.textSecondary,
  },
  card: {
    borderRadius: radius.lg,
    backgroundColor: palette.background,
    padding: spacing.md,
  },
  cta: {
    marginTop: spacing.sm,
    borderRadius: radius.lg,
  },
});
