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
  /** True while the user is completing a password-recovery deep link. */
  passwordRecoveryPending: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    phone: string,
  ) => Promise<{ needsEmailVerification: boolean; email: string }>;
  verifySignupEmail: (
    email: string,
    token: string,
    profile?: { fullName?: string; phone?: string },
  ) => Promise<void>;
  resendSignupEmail: (email: string) => Promise<void>;
  /** Establish a recovery session from the 6-digit email code. */
  verifyRecoveryEmail: (email: string, token: string) => Promise<void>;
  /** Resend the password-reset email (same as requesting reset again). */
  resendRecoveryEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
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
  passwordRecoveryPending: false,

  initialize: async () => {
    set({ isLoading: true });
    try {
      // Drop legacy biometric unlock preference (Settings toggle + gate removed).
      await authService.clearLegacyBiometricPreference();

      const session = await authService.getSession();
      const user = authService.mapUser(session?.user ?? null);
      if (user && session?.user) {
        await authService.prepareLocalAccount(session.user);
        set({
          user,
          isAuthenticated: true,
          isGuest: false,
          isInitialized: true,
        });
      } else {
        setGuestState(set);
        set({ isInitialized: true });
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
      const result = await authService.signUpWithEmail(email, password, fullName, phone);
      if (result.needsEmailVerification) {
        // Stay guest until the email OTP is verified.
        return {
          needsEmailVerification: true,
          email: result.email,
        };
      }

      const mapped = authService.mapUser(result.user);
      set({
        user: mapped,
        isAuthenticated: Boolean(mapped),
        isGuest: false,
        passwordRecoveryPending: false,
      });
      if (mapped) {
        trackEvent(AnalyticsEvents.signUp);
      }
      return {
        needsEmailVerification: false,
        email: result.email,
      };
    } finally {
      set({ isLoading: false });
    }
  },

  verifySignupEmail: async (email, token, profile) => {
    set({ isLoading: true });
    try {
      const { user } = await authService.verifySignupEmailOtp(email, token, profile);
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

  resendSignupEmail: async (email) => {
    await authService.resendSignupEmail(email);
  },

  verifyRecoveryEmail: async (email, token) => {
    set({ isLoading: true });
    try {
      const { user } = await authService.verifyRecoveryOtp(email, token);
      const mapped = authService.mapUser(user);
      set({
        user: mapped,
        isAuthenticated: Boolean(mapped),
        isGuest: false,
        passwordRecoveryPending: true,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  resendRecoveryEmail: async (email) => {
    await authService.resetPassword(email);
  },

  signOut: async () => {
    const userId = get().user?.id;
    const { clearPushRegistration } = await import('@/domains/notifications/push');
    const { wipeLocalAccountData } = await import('@/domains/auth/wipe-local-account');
    await clearPushRegistration();
    if (userId && !get().isGuest) {
      await wipeLocalAccountData(userId);
    }
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
    const { clearPushRegistration } = await import('@/domains/notifications/push');
    await clearPushRegistration();
    await authService.deleteAccount(userId);
    trackEvent(AnalyticsEvents.deleteAccount);
    queryClient.clear();
    setGuestState(set);
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
