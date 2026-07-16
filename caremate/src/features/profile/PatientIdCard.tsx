import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { CreditCard, Sparkles } from 'lucide-react-native';

import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { PressableScale } from '@/components/motion/PressableScale';
import { AppText } from '@/components/ui/AppText';
import { formatPatientId, isValidPatientId } from '@/domains/profile/patient-id';
import { profileRepository } from '@/domains/profile/repository';
import { syncEngine } from '@/sync/engine';
import { layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

type PatientIdCardProps = {
  userId: string;
  displayName?: string | null;
};

export function PatientIdCard({ userId, displayName }: PatientIdCardProps) {
  const queryClient = useQueryClient();
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

  const profile = profileQuery.data;
  const patientId = profile?.patientId ?? null;
  const hasId = isValidPatientId(patientId);
  const name = profile?.fullName?.trim() || displayName?.trim() || 'CareMate member';

  return (
    <View style={[styles.section, shadow.soft]}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <CreditCard color={palette.primary} size={18} strokeWidth={2.25} />
        </View>
        <View style={styles.headerCopy}>
          <AppText variant="caption" color="brand" style={styles.eyebrow}>
            Identity
          </AppText>
          <AppText variant="cardTitle" style={styles.title}>
            Patient ID card
          </AppText>
        </View>
      </View>
      <AppText variant="quickActionSubtitle" style={styles.description}>
        Your CareMate ID is unique to your account. Generate it once — it is not created at
        sign-up.
      </AppText>

      {hasId ? (
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
                      PATIENT ID
                    </AppText>
                  </View>
                </View>
                <AppText variant="sectionTitle" style={styles.atmNumber} numberOfLines={1}>
                  {formatPatientId(patientId)}
                </AppText>
                <AppText variant="body" style={styles.atmName} numberOfLines={1}>
                  {name}
                </AppText>
              </View>
            </LinearGradientFill>
          </View>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Sparkles color={palette.primary} size={22} />
          </View>
          <AppText variant="body" style={styles.emptyCopy}>
            No Patient ID yet. Generate one to attach a CareMate ID card to your profile.
          </AppText>
          {generateMutation.isError ? (
            <AppText variant="caption" style={styles.error}>
              {generateMutation.error instanceof Error
                ? generateMutation.error.message
                : 'Could not generate Patient ID'}
            </AppText>
          ) : null}
          <PressableScale
            style={[
              styles.generateButton,
              (generateMutation.isPending || profileQuery.isLoading) && styles.generateDisabled,
            ]}
            onPress={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || profileQuery.isLoading}
          >
            {generateMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <AppText variant="button" style={styles.generateLabel}>
                Generate ID for me
              </AppText>
            )}
          </PressableScale>
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
    // Shadow lives on the outer shell; clipping is on the inner view so edges aren't cut off.
    borderRadius: radius.xl,
    backgroundColor: '#115E59',
  },
  atmClip: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  atmCard: {
    aspectRatio: 1.586,
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
  atmName: {
    color: 'rgba(255,255,255,0.92)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontSize: 13,
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
