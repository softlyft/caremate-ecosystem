import { ChevronRight, MapPin, Phone, Shield } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import type { PayerOrganizationSummary } from '@/domains/payers/repository';
import { palette, radius, shadow } from '@/theme';

const THEME = {
  accent: '#4F46E5',
  soft: '#E0E7FF',
  softEnd: '#EEF2FF',
} as const;

type PayerDirectoryCardProps = {
  payer: PayerOrganizationSummary;
  onPress: () => void;
  typeLabel: string;
};

export function PayerDirectoryCard({ payer, onPress, typeLabel }: PayerDirectoryCardProps) {
  return (
    <Button
      style={[styles.shell, shadow.soft]}
      onPress={onPress}
      accessibilityLabel={payer.name}
      variant="plain"
    >
      <View style={styles.row}>
        <LinearGradientFill
          colors={[
            { offset: '0%', color: THEME.soft },
            { offset: '100%', color: THEME.softEnd },
          ]}
          angle={150}
          style={styles.media}
        >
          <View style={styles.mediaBlob} />
          <View style={[styles.iconRing, { borderColor: `${THEME.accent}28` }]}>
            <View style={[styles.iconInner, { backgroundColor: `${THEME.accent}18` }]}>
              <Shield color={THEME.accent} size={24} strokeWidth={2.25} />
            </View>
          </View>
        </LinearGradientFill>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <AppText variant="providerName" numberOfLines={2} style={styles.name}>
              {payer.name}
            </AppText>
            <View style={[styles.chevron, { backgroundColor: THEME.soft }]}>
              <ChevronRight color={THEME.accent} size={16} strokeWidth={2.5} />
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={[styles.typePill, { backgroundColor: THEME.soft }]}>
              <AppText variant="caption" style={{ color: THEME.accent, fontWeight: '600' }}>
                {typeLabel}
              </AppText>
            </View>
          </View>

          {payer.address ? (
            <View style={styles.addressRow}>
              <MapPin color={palette.textSecondary} size={13} />
              <AppText variant="providerMeta" numberOfLines={1} style={styles.address}>
                {payer.address}
              </AppText>
            </View>
          ) : null}

          {payer.phone ? (
            <View style={styles.phoneRow}>
              <Phone color={palette.textSecondary} size={12} />
              <AppText variant="caption" style={styles.phone}>
                {payer.phone}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
    </Button>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: radius.xl,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.divider,
    overflow: 'hidden',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    minHeight: 112,
  },
  media: {
    width: 96,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mediaBlob: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.45)',
    top: 18,
    left: 12,
  },
  iconRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  name: {
    flex: 1,
  },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typePill: {
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  address: {
    flex: 1,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phone: {
    color: palette.textSecondary,
  },
});
