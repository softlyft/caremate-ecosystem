import * as LocalAuthentication from 'expo-local-authentication';

import { STORAGE_KEYS } from '@/constants/config';
import { getPasswordResetRedirectUri } from '@/lib/auth-deep-link';
import { authStorage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { emergencyRepository } from '@/domains/emergency/repository';
import { profileRepository } from '@/domains/profile/repository';
import type { AuthUser } from '@/types';

export class AuthService {
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
      await profileRepository.save(data.user.id, {
        fullName,
        email,
        phone: normalizedPhone,
      });
      await emergencyRepository.save(data.user.id, { fullName });
      await profileRepository.saveSettings(data.user.id, {});
    }

    return data;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
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
