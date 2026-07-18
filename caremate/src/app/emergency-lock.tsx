import { useQuery } from '@tanstack/react-query';
import { Phone, ShieldAlert } from 'lucide-react-native';
import { Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { PressableScale } from '@/components/motion/PressableScale';
import { AppText } from '@/components/ui/AppText';
import { LoadingState } from '@/components/ui/screen-states';
import { readEmergencyLockSnapshot } from '@/domains/emergency/lock-surface';
import { useTranslation } from '@/domains/localization';
import { fontFamily, layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

/**
 * Public emergency card for responders (caremate://emergency-lock).
 * Visual language mirrors the Patient ID card (teal ATM panel) without flip/QR.
 */
export default function EmergencyLockScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const query = useQuery({
    queryKey: ['emergency-lock-surface'],
    queryFn: readEmergencyLockSnapshot,
  });

  if (query.isLoading) {
    return <LoadingState title={t('emergency.lock.loading')} />;
  }

  const snapshot = query.data;
  const hasProfile = Boolean(snapshot?.hasProfile);

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
              {t('emergency.lock.title')}
            </AppText>
          </View>
        </View>

        <AppText variant="subtitle" style={styles.help}>
          {t('emergency.lock.help')}
        </AppText>

        <View style={[styles.atmShell, shadow.card]}>
          <View style={styles.atmClip}>
            <LinearGradientFill
              colors={[
                { offset: '0%', color: '#0D9488' },
                { offset: '45%', color: '#0F766E' },
                { offset: '100%', color: '#115E59' },
              ]}
              angle={135}
              style={styles.atmCard}
            >
              <View style={styles.atmGlow} pointerEvents="none" />
              <View style={styles.atmContent}>
                <View style={styles.atmTop}>
                  <AppText variant="caption" style={styles.atmBrand}>
                    CareMate
                  </AppText>
                  <View style={styles.chipBadge}>
                    <AppText variant="caption" style={styles.atmChipLabel}>
                      {t('emergency.lock.cardBadge')}
                    </AppText>
                  </View>
                </View>

                {!hasProfile || !snapshot ? (
                  <>
                    <AppText variant="sectionTitle" style={styles.atmName}>
                      {t('emergency.lock.noProfile')}
                    </AppText>
                    <AppText variant="body" style={styles.atmMuted}>
                      {t('emergency.lock.noProfileMessage')}
                    </AppText>
                  </>
                ) : (
                  <>
                    <AppText variant="sectionTitle" style={styles.atmName} numberOfLines={2}>
                      {snapshot.fullName}
                    </AppText>

                    <View style={styles.vitalsRow}>
                      <VitalChip
                        label={t('emergency.fields.bloodGroup')}
                        value={snapshot.bloodGroup || t('common.notSet')}
                      />
                      <VitalChip
                        label={t('emergency.fields.genotype')}
                        value={snapshot.genotype || t('common.notSet')}
                      />
                    </View>

                    <View style={styles.fieldBlock}>
                      <AppText variant="caption" style={styles.fieldLabel}>
                        {t('emergency.fields.allergies')}
                      </AppText>
                      <AppText variant="body" style={styles.fieldValue}>
                        {snapshot.allergies || t('emergency.lock.noneListed')}
                      </AppText>
                    </View>

                    <View style={styles.divider} />

                    <AppText variant="caption" style={styles.fieldLabel}>
                      {t('emergency.lock.contactTitle')}
                    </AppText>
                    {snapshot.contactName ? (
                      <>
                        <AppText variant="body" style={styles.iceName} numberOfLines={1}>
                          {snapshot.contactName}
                          {snapshot.contactRelationship ? ` · ${snapshot.contactRelationship}` : ''}
                        </AppText>
                        {snapshot.contactPhone ? (
                          <AppText variant="cardTitle" style={styles.icePhone}>
                            {snapshot.contactPhone}
                          </AppText>
                        ) : null}
                      </>
                    ) : (
                      <AppText variant="body" style={styles.atmMuted}>
                        {t('emergency.lock.noContact')}
                      </AppText>
                    )}
                  </>
                )}
              </View>
            </LinearGradientFill>
          </View>
        </View>

        {hasProfile && snapshot?.contactPhone ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t('emergency.lock.callContact')}
            onPress={() => Linking.openURL(`tel:${snapshot.contactPhone}`)}
            style={[styles.callCta, shadow.soft]}
          >
            <Phone color="#FFFFFF" size={18} strokeWidth={2.25} />
            <AppText variant="button" style={styles.callCtaLabel}>
              {t('emergency.lock.callContact')}
            </AppText>
          </PressableScale>
        ) : null}

        <AppText variant="caption" style={styles.footnote}>
          {Platform.OS === 'ios'
            ? t('emergency.lock.footnoteIos')
            : t('emergency.lock.footnoteAndroid')}
        </AppText>
      </ScrollView>
    </View>
  );
}

function VitalChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.vitalChip}>
      <AppText variant="caption" style={styles.vitalLabel}>
        {label}
      </AppText>
      <AppText variant="body" style={styles.vitalValue} numberOfLines={1}>
        {value}
      </AppText>
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
    borderRadius: radius.lg,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    fontFamily: fontFamily.semiBold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  headerTitle: {
    color: palette.text,
  },
  help: {
    color: palette.textSecondary,
    marginTop: -4,
  },
  atmShell: {
    borderRadius: radius.xxl,
    overflow: 'hidden',
  },
  atmClip: {
    borderRadius: radius.xxl,
    overflow: 'hidden',
  },
  atmCard: {
    minHeight: 280,
    padding: spacing.lg,
  },
  atmGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -48,
    right: -36,
  },
  atmContent: {
    gap: spacing.sm,
    zIndex: 1,
  },
  atmTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  atmBrand: {
    color: '#CCFBF1',
    fontFamily: fontFamily.semiBold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontSize: 12,
  },
  chipBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  atmChipLabel: {
    color: '#FFFFFF',
    fontFamily: fontFamily.semiBold,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  atmName: {
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  atmMuted: {
    color: '#99F6E4',
  },
  vitalsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  vitalChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    gap: 2,
  },
  vitalLabel: {
    color: '#99F6E4',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  vitalValue: {
    color: '#FFFFFF',
    fontFamily: fontFamily.semiBold,
  },
  fieldBlock: {
    gap: 2,
    marginTop: spacing.xs,
  },
  fieldLabel: {
    color: '#99F6E4',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.35,
  },
  fieldValue: {
    color: '#FFFFFF',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginVertical: spacing.xs,
  },
  iceName: {
    color: '#FFFFFF',
  },
  icePhone: {
    color: '#5EEAD4',
    letterSpacing: 0.2,
  },
  callCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: palette.primary,
    borderRadius: radius.xl,
    paddingVertical: 16,
  },
  callCtaLabel: {
    color: '#FFFFFF',
  },
  footnote: {
    color: palette.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
