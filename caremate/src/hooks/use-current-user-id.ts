import { useAuthStore } from '@/features/auth/store';
import { GUEST_USER_ID } from '@/constants/guest';

export function useCurrentUserId(): string {
  const user = useAuthStore((state) => state.user);
  return user?.id ?? GUEST_USER_ID;
}

export function useIsGuest(): boolean {
  return useAuthStore((state) => state.isGuest);
}
