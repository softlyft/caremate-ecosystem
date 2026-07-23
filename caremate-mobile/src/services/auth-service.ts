import { STORAGE_KEYS } from '@/constants/config';
import { identityFromAuthUser } from '@/domains/auth/auth-identity';
import { bootstrapLocalAccountRecords } from '@/domains/auth/bootstrap-local-account';
import { migrateGuestLocalData } from '@/domains/auth/migrate-guest-data';
import { wipeLocalAccountData } from '@/domains/auth/wipe-local-account';
import { hydrateAccountEntitlements } from '@/domains/billing/hydrate-entitlements';
import { getPasswordResetRedirectUri } from '@/lib/auth-deep-link';
import { authStorage } from '@/lib/storage';
import { config } from '@/constants/env';
import { SUPABASE_NOT_CONFIGURED_MESSAGE, supabase } from '@/lib/supabase';
import type { AuthUser } from '@/types';

/** Legacy SecureStore key from the removed biometric unlock feature. */
const LEGACY_BIOMETRIC_ENABLED_KEY = 'caremate_biometric_enabled';

export class AuthService {
  /**
   * Guest merge + local profile/emergency/settings stubs so the app is usable
   * before (or without) a successful sync pull.
   */
  async prepareLocalAccount(
    user: {
      id: string;
      email?: string | null;
      phone?: string | null;
      user_metadata?: Record<string, unknown>;
    },
    overrides?: { fullName?: string; phone?: string; email?: string },
    options?: { forceDeviceDefaults?: boolean },
  ) {
    try {
      await migrateGuestLocalData(user.id);
    } catch {
      // Guest migration is best-effort; auth must still succeed.
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

    // New device / fresh SQLite: pull Premium entitlement before first UI paint races ads.
    try {
      await hydrateAccountEntitlements(user.id);
    } catch {
      // Sync engine will retry; auth must still succeed.
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

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }

    if (data.user) {
      await this.prepareLocalAccount(data.user);
    }

    return data;
  }

  async signUpWithEmail(email: string, password: string, fullName: string, phone: string) {
    if (!config.isSupabaseConfigured) {
      throw new Error(SUPABASE_NOT_CONFIGURED_MESSAGE);
    }

    const normalizedPhone = phone.trim();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: normalizedPhone,
        },
      },
    });
    if (error) {
      throw error;
    }

    if (data.user) {
      await this.prepareLocalAccount(
        data.user,
        { fullName, phone: normalizedPhone, email },
        { forceDeviceDefaults: true },
      );
    }

    return data;
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
      await this.signOut();
    } catch {
      // Session may already be invalid after auth.users delete.
    }
  }

  async resetPassword(email: string) {
    if (!config.isSupabaseConfigured) {
      throw new Error(SUPABASE_NOT_CONFIGURED_MESSAGE);
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: getPasswordResetRedirectUri(),
    });
    if (error) {
      throw error;
    }
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
