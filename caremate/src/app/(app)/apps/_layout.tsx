import { Slot } from 'expo-router';

import { MiniAppGuestGate } from '@/features/premium/MiniAppGuestGate';
import { useIsGuest } from '@/hooks/use-current-user-id';

export default function AppsLayout() {
  const isGuest = useIsGuest();

  if (isGuest) {
    return <MiniAppGuestGate />;
  }

  return <Slot />;
}
