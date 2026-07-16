import {
  Ambulance,
  BadgeCheck,
  Building2,
  ChevronRight,
  Droplets,
  FlaskConical,
  HeartPulse,
  MapPin,
  Phone,
  Pill,
  Star,
  Video,
  type LucideIcon,
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { PressableScale } from '@/components/motion/PressableScale';
import { AppText } from '@/components/ui/AppText';
import { formatProviderType, type ProviderType } from '@/domains/providers/types';
import type { Provider } from '@/types';
import { palette, radius, shadow } from '@/theme';

type TypeTheme = {
  icon: LucideIcon;
  accent: string;
  soft: string;
  softEnd: string;
};

const TYPE_THEME: Record<string, TypeTheme> = {
  hospital: {
    icon: Building2,
    accent: '#2563EB',
    soft: '#DBEAFE',
    softEnd: '#EFF6FF',
  },
  clinic: {
    icon: HeartPulse,
    accent: '#EA580C',
    soft: '#FFEDD5',
    softEnd: '#FFF7ED',
  },
  pharmacy: {
    icon: Pill,
    accent: '#0D9488',
    soft: '#CCFBF1',
    softEnd: '#F0FDFA',
  },
  laboratory: {
    icon: FlaskConical,
    accent: '#7C3AED',
    soft: '#EDE9FE',
    softEnd: '#F5F3FF',
  },
  telemedicine: {
    icon: Video,
    accent: '#0284C7',
    soft: '#E0F2FE',
    softEnd: '#F0F9FF',
  },
  blood_bank: {
    icon: Droplets,
    accent: '#DC2626',
    soft: '#FEE2E2',
    softEnd: '#FEF2F2',
  },
  ambulance: {
    icon: Ambulance,
    accent: '#D97706',
    soft: '#FEF3C7',
    softEnd: '#FFFBEB',
  },
};

const FALLBACK_THEME: TypeTheme = {
  icon: Building2,
  accent: palette.primary,
  soft: palette.primaryLight,
  softEnd: '#FFFFFF',
};

export function getProviderTypeTheme(type: string): TypeTheme {
  return TYPE_THEME[type] ?? FALLBACK_THEME;
}

function readRating(provider: Provider): number | null {
  const raw = provider.attributes.rating ?? provider.attributes.average_rating;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isVerified(provider: Provider): boolean {
  const raw = provider.attributes.verified ?? provider.attributes.is_verified;
  return raw === true || raw === 'true' || raw === 1;
}

type NearbyProviderCardProps = {
  provider: Provider;
  onPress: () => void;
};

export function NearbyProviderCard({ provider, onPress }: NearbyProviderCardProps) {
  const theme = getProviderTypeTheme(provider.type);
  const Icon = theme.icon;
  const rating = readRating(provider);
  const verified = isVerified(provider);
  const typeLabel = formatProviderType(provider.type as ProviderType);
  const distanceLabel = provider.distanceKm != null ? `${provider.distanceKm.toFixed(1)} km` : null;

  return (
    <PressableScale
      style={[styles.shell, shadow.soft]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={provider.name}
    >
      <View style={styles.row}>
        <LinearGradientFill
          colors={[
            { offset: '0%', color: theme.soft },
            { offset: '100%', color: theme.softEnd },
          ]}
          angle={150}
          style={styles.media}
        >
          <View style={styles.mediaBlob} />
          <View style={[styles.iconRing, { borderColor: `${theme.accent}28` }]}>
            <View style={[styles.iconInner, { backgroundColor: `${theme.accent}18` }]}>
              <Icon color={theme.accent} size={24} strokeWidth={2.25} />
            </View>
          </View>
          {distanceLabel ? (
            <View style={styles.distanceBadge}>
              <MapPin color={theme.accent} size={11} strokeWidth={2.5} />
              <AppText
                variant="caption"
                style={[styles.distanceBadgeText, { color: theme.accent }]}
              >
                {distanceLabel}
              </AppText>
            </View>
          ) : null}
        </LinearGradientFill>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <AppText variant="providerName" numberOfLines={2} style={styles.name}>
              {provider.name}
            </AppText>
            <View style={[styles.chevron, { backgroundColor: theme.soft }]}>
              <ChevronRight color={theme.accent} size={16} strokeWidth={2.5} />
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={[styles.typePill, { backgroundColor: theme.soft }]}>
              <AppText variant="caption" style={{ color: theme.accent, fontWeight: '600' }}>
                {typeLabel}
              </AppText>
            </View>
            {verified ? (
              <View style={styles.verifiedPill}>
                <BadgeCheck color={palette.primary} size={13} />
                <AppText variant="caption" color="brand">
                  Verified
                </AppText>
              </View>
            ) : null}
            {rating != null ? (
              <View style={styles.ratingPill}>
                <Star color={palette.warning} size={12} fill={palette.warning} />
                <AppText variant="caption">{rating.toFixed(1)}</AppText>
              </View>
            ) : null}
          </View>

          {provider.address ? (
            <View style={styles.addressRow}>
              <MapPin color={palette.textSecondary} size={13} />
              <AppText variant="providerMeta" numberOfLines={1} style={styles.address}>
                {provider.address}
              </AppText>
            </View>
          ) : (
            <AppText variant="providerMeta" style={styles.addressFallback}>
              Address unavailable
            </AppText>
          )}

          {provider.phone ? (
            <View style={styles.phoneRow}>
              <Phone color={palette.textSecondary} size={12} />
              <AppText variant="caption" style={styles.phone}>
                {provider.phone}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: radius.xxl,
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.divider,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    minHeight: 132,
  },
  media: {
    width: 108,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  mediaBlob: {
    position: 'absolute',
    top: -20,
    left: -24,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  iconRing: {
    width: 56,
    height: 56,
    borderRadius: radius.xl,
    padding: 3,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  iconInner: {
    flex: 1,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.88)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  distanceBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  body: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 12,
    paddingLeft: 12,
    gap: 8,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: palette.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: palette.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  address: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  addressFallback: {
    fontSize: 12,
    color: palette.textSecondary,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  phone: {
    color: palette.textSecondary,
    fontSize: 12,
  },
});
