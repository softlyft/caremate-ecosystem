import { create } from 'zustand';

import { GUEST_USER } from '@/constants/guest';
import { AnalyticsEvents, trackEvent } from '@/lib/monitoring/analytics';
import { trackUserSignedUp } from '@/lib/monitoring/product-analytics';
import { queryClient } from '@/lib/query-client';
import type { AuthUser } from '@/types';

type AuthService = typeof import('@/services/auth-service').authService;

/**
 * Lazy-load so Metro does not form store → auth-service → … → store cycles
 * (onboarding, location, mini-app synced storage, etc.).
 */
function getAuthService(): AuthService {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/services/auth-service').authService as AuthService;
}

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
    options?: { legalAcceptedAt?: string },
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
  /**
   * Local cleanup when Supabase reports the session ended elsewhere
   * (e.g. another device signed in and revoked this refresh token).
   * Does not call cloud sign-out again.
   */
  handleRemoteSessionEnd: () => Promise<void>;
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
      await getAuthService().clearLegacyBiometricPreference();

      const session = await getAuthService().getSession();
      const user = getAuthService().mapUser(session?.user ?? null);
      if (user && session?.user) {
        await getAuthService().prepareLocalAccount(session.user, undefined, {
          deferRemoteHydration: true,
        });
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
    } catch {
      // SecureStore / session restore can fail on unsigned simulator builds.
      setGuestState(set);
      set({ isInitialized: true });
    } finally {
      set({ isLoading: false });
    }
  },

  syncSessionFromSupabase: async () => {
    const session = await getAuthService().getSession();
    const user = getAuthService().mapUser(session?.user ?? null);
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
      const { user } = await getAuthService().signInWithEmail(email, password);
      const mapped = getAuthService().mapUser(user);
      set({
        user: mapped,
        isAuthenticated: Boolean(mapped),
        isGuest: false,
        passwordRecoveryPending: false,
      });
      if (mapped) {
        trackEvent(AnalyticsEvents.signIn);
        const { claimExclusiveNotificationDevice } = await import('@/domains/notifications/push');
        await claimExclusiveNotificationDevice();
      }
    } finally {
      set({ isLoading: false });
    }
  },

  signUp: async (email, password, fullName, phone, options) => {
    set({ isLoading: true });
    try {
      const result = await getAuthService().signUpWithEmail(
        email,
        password,
        fullName,
        phone,
        options,
      );
      if (result.needsEmailVerification) {
        // Stay guest until the email OTP is verified.
        return {
          needsEmailVerification: true,
          email: result.email,
        };
      }

      const mapped = getAuthService().mapUser(result.user);
      set({
        user: mapped,
        isAuthenticated: Boolean(mapped),
        isGuest: false,
        passwordRecoveryPending: false,
      });
      if (mapped) {
        trackUserSignedUp('email');
        const { claimExclusiveNotificationDevice } = await import('@/domains/notifications/push');
        await claimExclusiveNotificationDevice();
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
      const { user } = await getAuthService().verifySignupEmailOtp(email, token, profile);
      const mapped = getAuthService().mapUser(user);
      set({
        user: mapped,
        isAuthenticated: Boolean(mapped),
        isGuest: false,
        passwordRecoveryPending: false,
      });
      if (mapped) {
        trackUserSignedUp('email');
        const { claimExclusiveNotificationDevice } = await import('@/domains/notifications/push');
        await claimExclusiveNotificationDevice();
      }
    } finally {
      set({ isLoading: false });
    }
  },

  resendSignupEmail: async (email) => {
    await getAuthService().resendSignupEmail(email);
  },

  verifyRecoveryEmail: async (email, token) => {
    set({ isLoading: true });
    try {
      const { user } = await getAuthService().verifyRecoveryOtp(email, token);
      const mapped = getAuthService().mapUser(user);
      set({
        user: mapped,
        isAuthenticated: Boolean(mapped),
        isGuest: false,
        passwordRecoveryPending: true,
      });
      if (mapped) {
        const { claimExclusiveNotificationDevice } = await import('@/domains/notifications/push');
        await claimExclusiveNotificationDevice();
      }
    } finally {
      set({ isLoading: false });
    }
  },

  resendRecoveryEmail: async (email) => {
    await getAuthService().resetPassword(email);
  },

  signOut: async () => {
    const { clearDeviceNotificationState } = await import('@/domains/notifications/push');
    await clearDeviceNotificationState();
    // Do not clear mini-app stores on sign-out. Zustand persist would write empty
    // state over AsyncStorage/SQLite while the session is still active, wiping
    // local vitals and other trackers. Keep device-bound local data so the same
    // email can sign back in without re-entering everything. Guests cannot open
    // mini-apps; a different account still goes through confirmDeviceAccountForAuth wipe.
    await getAuthService().signOut();
    trackEvent(AnalyticsEvents.signOut);
    // Drop premium cache so the next session cannot reuse a stale or wrong-shaped entry.
    queryClient.removeQueries({ queryKey: ['billing', 'premium'] });
    setGuestState(set);
  },

  handleRemoteSessionEnd: async () => {
    if (get().isGuest || !get().isAuthenticated) {
      return;
    }
    try {
      const { clearDeviceNotificationState } = await import('@/domains/notifications/push');
      await clearDeviceNotificationState();
    } catch {
      // Best-effort; session may already be unusable for server deletes.
    }
    queryClient.removeQueries({ queryKey: ['billing', 'premium'] });
    setGuestState(set);
  },

  deleteAccount: async () => {
    const userId = get().user?.id;
    if (!userId || get().isGuest) {
      throw new Error('Sign in to delete your account.');
    }
    const { clearDeviceNotificationState } = await import('@/domains/notifications/push');
    await clearDeviceNotificationState();
    await getAuthService().deleteAccount(userId);
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
      await getAuthService().updatePassword(password);
      await get().syncSessionFromSupabase();
      set({ passwordRecoveryPending: false });
    } finally {
      set({ isLoading: false });
    }
  },
}));
