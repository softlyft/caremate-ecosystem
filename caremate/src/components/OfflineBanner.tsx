import { AppText } from '@/components/ui/AppText';
import { Box } from '@/components/ui/box';
import { useNetworkStatus } from '@/hooks/use-network-status';

export function OfflineBanner() {
  const { online } = useNetworkStatus();

  if (online) {
    return null;
  }

  return (
    <Box className="bg-amber-100 rounded-lg px-4 py-2">
      <AppText variant="caption" style={{ color: '#1F2937', textAlign: 'center' }}>
        You are offline. Changes will sync when you reconnect.
      </AppText>
    </Box>
  );
}
