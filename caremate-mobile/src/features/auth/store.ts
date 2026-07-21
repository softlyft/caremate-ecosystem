import { create } from 'zustand';

import { GUEST_USER } from '@/constants/guest';
import { AnalyticsEvents, trackEvent } from '@/lib/monitoring/analytics';
import { queryClient } from '@/lib/query-client';
import { authService } from '@/services/auth-service';
import type { AuthUser } from '@/types';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  biometricEnabled: boolean;
  /** True while the user is completing a password-recovery deep link. */
  passwordRecoveryPending: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  markPasswordRecovery: () => Promise<void>;
  clearPasswordRecovery: () => void;
  updatePassword: (password: string) => Promise<void>;
  syncSessionFromSupabase: () => Promise<void>;
}

function setGuestState(set: (partial: Partial<AuthState>) => void) {
  set({
    user: { ...GUEST_USER },
    isAuthenticated: false,
    isGuest: true,
    passwordRecoveryPending: false,
  });
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: { ...GUEST_USER },
  isAuthenticated: false,
  isGuest: true,
  isLoading: false,
  isInitialized: false,
  biometricEnabled: false,
  passwordRecoveryPending: false,

  initialize: async () => {
    set({ isLoading: true });
    try {
      const [session, biometricEnabled] = await Promise.all([
        authService.getSession(),
        authService.isBiometricEnabled(),
      ]);

      const user = authService.mapUser(session?.user ?? null);
      if (user && session?.user) {
        await authService.prepareLocalAccount(session.user);
        set({
          user,
          isAuthenticated: true,
          isGuest: false,
          biometricEnabled,
          isInitialized: true,
        });
      } else {
        setGuestState(set);
        set({ biometricEnabled, isInitialized: true });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  syncSessionFromSupabase: async () => {
    const session = await authService.getSession();
    const user = authService.mapUser(session?.user ?? null);
    if (user) {
      set({
        user,
        isAuthenticated: true,
        isGuest: false,
      });
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true });
    try {
      const { user } = await authService.signInWithEmail(email, password);
      const mapped = authService.mapUser(user);
      set({
        user: mapped,
        isAuthenticated: Boolean(mapped),
        isGuest: false,
        passwordRecoveryPending: false,
      });
      if (mapped) {
        trackEvent(AnalyticsEvents.signIn);
      }
    } finally {
      set({ isLoading: false });
    }
  },

  signUp: async (email, password, fullName, phone) => {
    set({ isLoading: true });
    try {
      const { user } = await authService.signUpWithEmail(email, password, fullName, phone);
      const mapped = authService.mapUser(user);
      set({
        user: mapped,
        isAuthenticated: Boolean(mapped),
        isGuest: false,
        passwordRecoveryPending: false,
      });
      if (mapped) {
        trackEvent(AnalyticsEvents.signUp);
      }
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    await authService.signOut();
    trackEvent(AnalyticsEvents.signOut);
    // Drop premium cache so the next session cannot reuse a stale or wrong-shaped entry.
    queryClient.removeQueries({ queryKey: ['billing', 'premium'] });
    setGuestState(set);
  },

  deleteAccount: async () => {
    const userId = get().user?.id;
    if (!userId || get().isGuest) {
      throw new Error('Sign in to delete your account.');
    }
    await authService.deleteAccount(userId);
    trackEvent(AnalyticsEvents.deleteAccount);
    queryClient.clear();
    setGuestState(set);
  },

  setBiometricEnabled: async (enabled) => {
    await authService.setBiometricEnabled(enabled);
    set({ biometricEnabled: enabled });
  },

  markPasswordRecovery: async () => {
    await get().syncSessionFromSupabase();
    set({ passwordRecoveryPending: true });
  },

  clearPasswordRecovery: () => {
    set({ passwordRecoveryPending: false });
  },

  updatePassword: async (password) => {
    set({ isLoading: true });
    try {
      await authService.updatePassword(password);
      await get().syncSessionFromSupabase();
      set({ passwordRecoveryPending: false });
    } finally {
      set({ isLoading: false });
    }
  },
}));
