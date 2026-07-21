import { WifiOff } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { layoutSpacing, palette, radius } from '@/theme';

type OfflineBannerProps = {
  /** Skip outer margins when the parent already handles padding/gaps. */
  flush?: boolean;
};

export function OfflineBanner({ flush = false }: OfflineBannerProps) {
  const { online } = useNetworkStatus();

  if (online) {
    return null;
  }

  return (
    <View style={[styles.container, flush ? null : styles.inset]}>
      <View style={styles.iconWrap}>
        <WifiOff color="#B45309" size={16} strokeWidth={2.5} />
      </View>
      <AppText variant="caption" style={styles.text}>
        You&apos;re offline — cached content is available. Changes sync when you reconnect.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  inset: {
    marginHorizontal: layoutSpacing.screenHorizontal,
    marginBottom: layoutSpacing.sectionTitleToContent,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    color: palette.text,
    fontSize: 12,
    lineHeight: 17,
  },
});
