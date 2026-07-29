import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { CreditCard, QrCode, Sparkles } from 'lucide-react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';
import { Button } from '@/components/ui/form-controls';

import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/domains/localization';
import { buildEmergencyShareUrl, isValidEmergencyShareToken } from '@/domains/emergency/share';
import { formatPatientId, isValidPatientId } from '@/domains/profile/patient-id';
import { profileRepository } from '@/domains/profile/repository';
import { syncEngine } from '@/sync/engine';
import { layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

type PatientIdCardProps = {
  userId: string;
  displayName?: string | null;
};

/** Opaque CareMate deep link for emergency share (no PHI in the QR). */
export function buildPatientIdQrPayload(params: { shareToken: string }): string {
  return buildEmergencyShareUrl(params.shareToken);
}

export function PatientIdCard({ userId, displayName }: PatientIdCardProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const flip = useSharedValue(0);

  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => profileRepository.findByUserId(userId),
  });

  const generateMutation = useMutation({
    mutationFn: () => profileRepository.generatePatientIdForUser(userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      syncEngine.requestSync({ reason: 'write', immediate: true });
    },
  });

  const ensureTokenMutation = useMutation({
    mutationFn: () => profileRepository.ensureEmergencyShareToken(userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      syncEngine.requestSync({ reason: 'write', immediate: true });
    },
  });

  const profile = profileQuery.data;
  const patientId = profile?.patientId ?? null;
  const shareToken = profile?.emergencyShareToken ?? null;
  const hasId = isValidPatientId(patientId);
  const hasShareToken = isValidEmergencyShareToken(shareToken);
  const name =
    profile?.fullName?.trim() || displayName?.trim() || t('profile.patientId.fallbackName');

  useEffect(() => {
    if (hasId && !hasShareToken && !ensureTokenMutation.isPending) {
      ensureTokenMutation.mutate();
    }
    // Intentionally only react to id/token readiness — not the whole mutation object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasId, hasShareToken]);

  const frontStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flip.value, [0, 1], [0, 180]);
    return {
      transform: [{ perspective: 1200 }, { rotateY: `${rotateY}deg` }],
      opacity: flip.value > 0.5 ? 0 : 1,
      zIndex: flip.value > 0.5 ? 0 : 1,
    };
  });

  const backStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flip.value, [0, 1], [180, 360]);
    return {
      transform: [{ perspective: 1200 }, { rotateY: `${rotateY}deg` }],
      opacity: flip.value > 0.5 ? 1 : 0,
      zIndex: flip.value > 0.5 ? 1 : 0,
    };
  });

  function toggleFlip() {
    // Reanimated shared values are mutable by design.
    // eslint-disable-next-line react-hooks/immutability
    flip.value = withTiming(flip.value > 0.5 ? 0 : 1, { duration: 420 });
  }

  return (
    <View style={[styles.section, shadow.soft]}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <CreditCard color={palette.primary} size={18} strokeWidth={2.25} />
        </View>
        <View style={styles.headerCopy}>
          <AppText variant="caption" color="brand" style={styles.eyebrow}>
            {t('profile.patientId.eyebrow')}
          </AppText>
          <AppText variant="cardTitle" style={styles.title}>
            {t('profile.patientId.cardTitle')}
          </AppText>
        </View>
      </View>
      <AppText variant="quickActionSubtitle" style={styles.description}>
        {t('profile.patientId.description')}
      </AppText>

      {hasId && patientId ? (
        <>
          <Button
            accessibilityRole="button"
            accessibilityLabel={t('profile.patientId.flipA11y')}
            onPress={toggleFlip}
            style={[styles.atmShell, shadow.card]}
            variant="plain"
          >
            <View style={styles.flipScene}>
              <Animated.View style={[styles.face, frontStyle]} pointerEvents="box-none">
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
                            {t('profile.patientId.badge')}
                          </AppText>
                        </View>
                      </View>
                      <AppText variant="sectionTitle" style={styles.atmNumber} numberOfLines={1}>
                        {formatPatientId(patientId)}
                      </AppText>
                      <View style={styles.atmBottom}>
                        <AppText variant="body" style={styles.atmName} numberOfLines={1}>
                          {name}
                        </AppText>
                        <View style={styles.flipHintChip}>
                          <QrCode color="#FFFFFF" size={12} strokeWidth={2.25} />
                          <AppText variant="caption" style={styles.flipHintText}>
                            {t('profile.patientId.tapForQr')}
                          </AppText>
                        </View>
                      </View>
                    </View>
                  </LinearGradientFill>
                </View>
              </Animated.View>

              <Animated.View
                style={[styles.face, styles.faceBack, backStyle]}
                pointerEvents="box-none"
              >
                <View style={styles.atmClip}>
                  <LinearGradientFill
                    colors={[
                      { offset: '0%', color: '#115E59' },
                      { offset: '55%', color: '#0F766E' },
                      { offset: '100%', color: '#0D9488' },
                    ]}
                    angle={145}
                    style={styles.atmCard}
                  >
                    <View style={styles.backContent}>
                      <AppText variant="caption" style={styles.backEyebrow}>
                        {t('profile.patientId.qrSide')}
                      </AppText>
                      <View style={styles.qrFrame}>
                        {hasShareToken && shareToken ? (
                          <QRCode
                            value={buildPatientIdQrPayload({ shareToken })}
                            size={148}
                            backgroundColor="#FFFFFF"
                            color="#115E59"
                            ecl="M"
                          />
                        ) : (
                          <ActivityIndicator color="#115E59" />
                        )}
                      </View>
                      <AppText variant="caption" style={styles.backId} numberOfLines={1}>
                        {formatPatientId(patientId)}
                      </AppText>
                      <AppText variant="caption" style={styles.backHint}>
                        {t('profile.patientId.tapForFront')}
                      </AppText>
                    </View>
                  </LinearGradientFill>
                </View>
              </Animated.View>
            </View>
          </Button>
        </>
      ) : (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Sparkles color={palette.primary} size={22} />
          </View>
          <AppText variant="body" style={styles.emptyCopy}>
            {t('profile.patientId.empty')}
          </AppText>
          {generateMutation.isError ? (
            <AppText variant="caption" style={styles.error}>
              {generateMutation.error instanceof Error
                ? generateMutation.error.message
                : t('profile.patientId.generateError')}
            </AppText>
          ) : null}
          <Button
            style={[
              styles.generateButton,
              (generateMutation.isPending || profileQuery.isLoading) && styles.generateDisabled,
            ]}
            onPress={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || profileQuery.isLoading}
            variant="plain"
          >
            {generateMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <AppText variant="button" style={styles.generateLabel}>
                {t('profile.patientId.generate')}
              </AppText>
            )}
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
    backgroundColor: palette.background,
    borderRadius: radius.xxl,
    padding: layoutSpacing.cardPadding,
    borderWidth: 1,
    borderColor: palette.divider,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 11,
  },
  title: {
    fontSize: 17,
  },
  description: {
    lineHeight: 20,
  },
  atmShell: {
    borderRadius: radius.xl,
    backgroundColor: '#115E59',
  },
  flipScene: {
    aspectRatio: 1.586,
    width: '100%',
  },
  face: {
    ...StyleSheet.absoluteFill,
    backfaceVisibility: 'hidden',
  },
  faceBack: {
    // Keep absolute stacking for flip
  },
  atmClip: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...StyleSheet.absoluteFill,
  },
  atmCard: {
    ...StyleSheet.absoluteFill,
    width: '100%',
  },
  atmContent: {
    ...StyleSheet.absoluteFill,
    paddingHorizontal: spacing.md + 4,
    paddingVertical: spacing.md + 4,
    justifyContent: 'space-between',
  },
  atmGlow: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  atmTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  atmBrand: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 1.2,
    fontSize: 13,
  },
  chipBadge: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  atmChipLabel: {
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.8,
    fontSize: 10,
  },
  atmNumber: {
    color: '#FFFFFF',
    letterSpacing: 2.4,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    fontSize: 22,
  },
  atmBottom: {
    gap: 8,
  },
  atmName: {
    color: 'rgba(255,255,255,0.92)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontSize: 13,
  },
  flipHintChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  flipHintText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 11,
    fontWeight: '600',
  },
  backContent: {
    ...StyleSheet.absoluteFill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backEyebrow: {
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontSize: 11,
    fontWeight: '700',
  },
  qrFrame: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: 10,
  },
  backId: {
    color: '#FFFFFF',
    letterSpacing: 1.6,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    fontSize: 12,
  },
  backHint: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
  },
  emptyCard: {
    gap: spacing.sm,
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.divider,
    alignItems: 'flex-start',
  },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCopy: {
    color: palette.textSecondary,
    lineHeight: 21,
  },
  error: {
    color: palette.danger,
  },
  generateButton: {
    marginTop: 4,
    alignSelf: 'stretch',
    backgroundColor: palette.primary,
    borderRadius: radius.full,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  generateDisabled: {
    opacity: 0.7,
  },
  generateLabel: {
    color: '#FFFFFF',
  },
});
