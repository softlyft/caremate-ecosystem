import * as LocalAuthentication from 'expo-local-authentication';

import { STORAGE_KEYS } from '@/constants/config';
import { identityFromAuthUser } from '@/domains/auth/auth-identity';
import { bootstrapLocalAccountRecords } from '@/domains/auth/bootstrap-local-account';
import { migrateGuestLocalData } from '@/domains/auth/migrate-guest-data';
import { wipeLocalAccountData } from '@/domains/auth/wipe-local-account';
import { hydrateAccountEntitlements } from '@/domains/billing/hydrate-entitlements';
import { getPasswordResetRedirectUri } from '@/lib/auth-deep-link';
import { authStorage } from '@/lib/storage';
import { config } from '@/constants/env';
import { supabase } from '@/lib/supabase';
import type { AuthUser } from '@/types';

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
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: getPasswordResetRedirectUri(),
    });
    if (error) {
      throw error;
    }
  }

  async updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      throw error;
    }
  }

  async exchangeCodeForSession(code: string) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      throw error;
    }
  }

  async setSessionFromTokens(tokens: { access_token: string; refresh_token: string }) {
    const { error } = await supabase.auth.setSession(tokens);
    if (error) {
      throw error;
    }
  }

  async isBiometricAvailable(): Promise<boolean> {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return compatible && enrolled;
  }

  async authenticateWithBiometrics(): Promise<boolean> {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock CareMate',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    return result.success;
  }

  async setBiometricEnabled(enabled: boolean): Promise<void> {
    await authStorage.setItem(STORAGE_KEYS.biometricEnabled, enabled ? 'true' : 'false');
  }

  async isBiometricEnabled(): Promise<boolean> {
    const value = await authStorage.getItem(STORAGE_KEYS.biometricEnabled);
    return value === 'true';
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
