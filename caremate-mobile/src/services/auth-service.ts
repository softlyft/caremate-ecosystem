import { STORAGE_KEYS } from '@/constants/config';
import { identityFromAuthUser } from '@/domains/auth/auth-identity';
import { bootstrapLocalAccountRecords } from '@/domains/auth/bootstrap-local-account';
import {
  bindDeviceAccount,
  clearDeviceAccountBinding,
  legacyNormalizeAccountEmail,
  normalizeAccountEmail,
} from '@/domains/auth/device-account-binding';
import { migrateGuestLocalData } from '@/domains/auth/migrate-guest-data';
import { wipeLocalAccountData } from '@/domains/auth/wipe-local-account';
import { hydrateAccountEntitlements } from '@/domains/billing/hydrate-entitlements';
import { hydrateEmergencyProfile } from '@/domains/emergency/hydrate-emergency';
import { hydrateMiniAppsFromRemote } from '@/mini-apps/_kit/hydrate';
import { getPasswordResetRedirectUri } from '@/lib/auth-deep-link';
import { authStorage } from '@/lib/storage';
import { config } from '@/constants/env';
import { SUPABASE_NOT_CONFIGURED_MESSAGE, supabase } from '@/lib/supabase';
import type { AuthUser } from '@/types';

/** Legacy SecureStore key from the removed biometric unlock feature. */
const LEGACY_BIOMETRIC_ENABLED_KEY = 'caremate_biometric_enabled';

/** Prefer canonical email; include pre-canonicalization form for existing accounts. */
function authEmailsToTry(email: string): string[] {
  const canonical = normalizeAccountEmail(email);
  const legacy = legacyNormalizeAccountEmail(email);
  return canonical === legacy ? [canonical] : [canonical, legacy];
}

function isInvalidCredentialError(error: { message?: string; status?: number } | null): boolean {
  if (!error) return false;
  const message = (error.message ?? '').toLowerCase();
  return message.includes('invalid login credentials') || message.includes('invalid credentials');
}

export class AuthService {
  /**
   * Guest merge → (optional remote hydrates) → local stubs → device bind.
   * Pass `deferRemoteHydration: true` on cold start so first paint is not blocked by
   * network (emergency / mini-apps / entitlements). Sync + post-auth effects cover those.
   */
  async prepareLocalAccount(
    user: {
      id: string;
      email?: string | null;
      phone?: string | null;
      user_metadata?: Record<string, unknown>;
    },
    overrides?: { fullName?: string; phone?: string; email?: string },
    options?: { forceDeviceDefaults?: boolean; deferRemoteHydration?: boolean },
  ) {
    try {
      await migrateGuestLocalData(user.id);
    } catch {
      // Guest migration is best-effort; auth must still succeed.
    }

    if (!options?.deferRemoteHydration) {
      // New device / clear-data: restore cloud emergency before bootstrap can create a shell.
      try {
        await hydrateEmergencyProfile(user.id);
      } catch {
        // Sync engine will retry; auth must still succeed.
      }
    }

    try {
      await bootstrapLocalAccountRecords(
        {
          ...identityFromAuthUser(user),
          ...(overrides?.email !== undefined ? { email: overrides.email } : {}),
          ...(overrides?.fullName !== undefined ? { fullName: overrides.fullName } : {}),
          ...(overrides?.phone !== undefined ? { phone: overrides.phone } : {}),
        },
        options,
      );
    } catch {
      // Local stubs are best-effort; auth must still succeed.
    }

    if (!options?.deferRemoteHydration) {
      // New device / clear-data: restore mini-app snapshots into local storage while empty.
      try {
        await hydrateMiniAppsFromRemote(user.id);
      } catch {
        // Sync engine will retry; auth must still succeed.
      }

      // New device / fresh SQLite: pull Premium entitlement before first UI paint races ads.
      try {
        await hydrateAccountEntitlements(user.id);
      } catch {
        // Sync engine will retry; auth must still succeed.
      }
    }

    try {
      await bindDeviceAccount(
        user.id,
        overrides?.email ?? user.email ?? identityFromAuthUser(user).email,
      );
    } catch {
      // Device binding is best-effort; auth must still succeed.
    }
  }

  async getSession() {
    if (!config.isSupabaseConfigured) {
      return null;
    }

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw error;
    }
    return data.session;
  }

  mapUser(
    user: { id: string; email?: string | null; phone?: string | null } | null,
  ): AuthUser | null {
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email ?? null,
      phone: user.phone ?? null,
    };
  }

  async signInWithEmail(email: string, password: string) {
    if (!config.isSupabaseConfigured) {
      throw new Error(SUPABASE_NOT_CONFIGURED_MESSAGE);
    }

    const emails = authEmailsToTry(email);
    let lastError: { message?: string; status?: number } | null = null;

    for (const candidate of emails) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: candidate,
        password,
      });
      if (!error) {
        if (data.user) {
          await this.prepareLocalAccount(data.user);
        }
        return data;
      }
      lastError = error;
      if (!isInvalidCredentialError(error)) {
        throw error;
      }
    }

    throw lastError ?? new Error('Sign in failed');
  }

  async signUpWithEmail(
    email: string,
    password: string,
    fullName: string,
    phone: string,
    options?: { legalAcceptedAt?: string },
  ) {
    if (!config.isSupabaseConfigured) {
      throw new Error(SUPABASE_NOT_CONFIGURED_MESSAGE);
    }

    const normalizedEmail = normalizeAccountEmail(email);
    const normalizedPhone = phone.trim();
    const legalAcceptedAt = options?.legalAcceptedAt?.trim() || undefined;
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: normalizedPhone,
          ...(legalAcceptedAt
            ? {
                legal_accepted_at: legalAcceptedAt,
                accepted_terms_at: legalAcceptedAt,
                accepted_privacy_at: legalAcceptedAt,
              }
            : {}),
        },
      },
    });
    if (error) {
      throw error;
    }

    // Supabase returns an empty identities list when the email is already registered.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error('An account with this email already exists. Sign in or reset your password.');
    }

    // Confirmations enabled: session is null until the email OTP is verified.
    if (!data.session) {
      return {
        needsEmailVerification: true as const,
        email: normalizedEmail,
        user: data.user,
      };
    }

    if (data.user) {
      await this.prepareLocalAccount(
        data.user,
        { fullName, phone: normalizedPhone, email: normalizedEmail },
        { forceDeviceDefaults: true },
      );
    }

    return {
      needsEmailVerification: false as const,
      email: normalizedEmail,
      user: data.user,
    };
  }

  async verifySignupEmailOtp(
    email: string,
    token: string,
    profile?: { fullName?: string; phone?: string },
  ) {
    if (!config.isSupabaseConfigured) {
      throw new Error(SUPABASE_NOT_CONFIGURED_MESSAGE);
    }

    const code = token.replace(/\s+/g, '');
    if (!/^\d{6}$/.test(code)) {
      throw new Error('Enter the 6-digit code from your email');
    }

    const emails = authEmailsToTry(email);
    let lastError: { message?: string } | null = null;

    for (const candidate of emails) {
      const { data, error } = await supabase.auth.verifyOtp({
        email: candidate,
        token: code,
        type: 'signup',
      });
      if (!error) {
        if (!data.user || !data.session) {
          throw new Error('Could not verify email. Try the code again or request a new one.');
        }

        await this.prepareLocalAccount(
          data.user,
          {
            email: candidate,
            ...(profile?.fullName ? { fullName: profile.fullName } : {}),
            ...(profile?.phone ? { phone: profile.phone } : {}),
          },
          { forceDeviceDefaults: true },
        );

        return data;
      }
      lastError = error;
    }

    throw (
      lastError ?? new Error('Could not verify email. Try the code again or request a new one.')
    );
  }

  async resendSignupEmail(email: string) {
    if (!config.isSupabaseConfigured) {
      throw new Error(SUPABASE_NOT_CONFIGURED_MESSAGE);
    }

    const emails = authEmailsToTry(email);
    let lastError: { message?: string } | null = null;
    for (const candidate of emails) {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: candidate,
      });
      if (!error) {
        return;
      }
      lastError = error;
    }
    throw lastError ?? new Error('Could not resend verification email');
  }

  async signOut() {
    if (!config.isSupabaseConfigured) {
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  }

  /**
   * Permanently delete the signed-in account (cloud + local).
   * Requires a configured Supabase project and the `delete-account` edge function.
   */
  async deleteAccount(userId: string) {
    if (!config.isSupabaseConfigured) {
      throw new Error('Account deletion requires a configured CareMate backend.');
    }

    const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
      'delete-account',
      { body: {} },
    );

    if (error) {
      throw error;
    }
    if (data && typeof data === 'object' && 'error' in data && data.error) {
      throw new Error(String(data.error));
    }

    try {
      await wipeLocalAccountData(userId);
    } catch {
      // Cloud delete already succeeded; local wipe is best-effort.
    }

    try {
      await clearDeviceAccountBinding();
    } catch {
      // Binding clear is best-effort after account delete.
    }

    try {
      await this.signOut();
    } catch {
      // Session may already be invalid after auth.users delete.
    }
  }

  async resetPassword(email: string) {
    if (!config.isSupabaseConfigured) {
      throw new Error(SUPABASE_NOT_CONFIGURED_MESSAGE);
    }

    // Email template shows a 6-digit {{ .Token }} (see supabase/templates/recovery.html).
    // Users enter the code in-app via verifyOtp(type: 'recovery') — no browser redirect required.
    // Try canonical then legacy so pre-normalization Gmail accounts still receive the code.
    const emails = authEmailsToTry(email);
    let lastError: { message?: string } | null = null;
    for (const candidate of emails) {
      const { error } = await supabase.auth.resetPasswordForEmail(candidate, {
        redirectTo: getPasswordResetRedirectUri(),
      });
      if (!error) {
        return;
      }
      lastError = error;
    }
    throw lastError ?? new Error('Could not send password reset email');
  }

  async verifyRecoveryOtp(email: string, token: string) {
    if (!config.isSupabaseConfigured) {
      throw new Error(SUPABASE_NOT_CONFIGURED_MESSAGE);
    }

    const code = token.replace(/\s+/g, '');
    if (!/^\d{6}$/.test(code)) {
      throw new Error('Enter the 6-digit code from your email');
    }

    const emails = authEmailsToTry(email);
    let lastError: { message?: string } | null = null;

    for (const candidate of emails) {
      const { data, error } = await supabase.auth.verifyOtp({
        email: candidate,
        token: code,
        type: 'recovery',
      });
      if (!error) {
        if (!data.user || !data.session) {
          throw new Error('Could not verify reset code. Try again or request a new one.');
        }
        await this.prepareLocalAccount(data.user, { email: candidate });
        return data;
      }
      lastError = error;
    }

    throw lastError ?? new Error('Could not verify reset code. Try again or request a new one.');
  }

  async updatePassword(password: string) {
    if (!config.isSupabaseConfigured) {
      throw new Error(SUPABASE_NOT_CONFIGURED_MESSAGE);
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      throw error;
    }
  }

  async exchangeCodeForSession(code: string) {
    if (!config.isSupabaseConfigured) {
      throw new Error(SUPABASE_NOT_CONFIGURED_MESSAGE);
    }

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      throw error;
    }
  }

  async setSessionFromTokens(tokens: { access_token: string; refresh_token: string }) {
    if (!config.isSupabaseConfigured) {
      throw new Error(SUPABASE_NOT_CONFIGURED_MESSAGE);
    }

    const { error } = await supabase.auth.setSession(tokens);
    if (error) {
      throw error;
    }
  }

  async clearLegacyBiometricPreference(): Promise<void> {
    try {
      await authStorage.removeItem(LEGACY_BIOMETRIC_ENABLED_KEY);
    } catch {
      // Missing key / SecureStore unavailable is fine.
    }
  }

  async setOnboardingComplete(complete: boolean): Promise<void> {
    await authStorage.setItem(STORAGE_KEYS.onboardingComplete, complete ? 'true' : 'false');
  }

  async isOnboardingComplete(): Promise<boolean> {
    const value = await authStorage.getItem(STORAGE_KEYS.onboardingComplete);
    return value === 'true';
  }
}

export const authService = new AuthService();
