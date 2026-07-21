import { useQuery } from '@tanstack/react-query';

import { getDeviceDefaults } from '@/domains/onboarding';

export function useDeviceDefaults() {
  return useQuery({
    queryKey: ['device-defaults'],
    queryFn: getDeviceDefaults,
    staleTime: 60_000,
  });
}
