import { isDatabaseInitialized } from '@/database/client';
import type { LocalAccountIdentity } from '@/domains/auth/auth-identity';
import { emergencyRepository } from '@/domains/emergency/repository';
import { applyDeviceDefaultsToProfile, getDeviceDefaults } from '@/domains/onboarding';
import { isWeakDisplayName, resolveAccountDisplayName } from '@/domains/profile/display-name';
import { profileRepository } from '@/domains/profile/repository';
import { useSettingsStore } from '@/domains/profile/store';

export type { LocalAccountIdentity } from '@/domains/auth/auth-identity';
export { identityFromAuthUser } from '@/domains/auth/auth-identity';

/**
 * Ensures local profile, settings, and emergency rows exist right after auth.
 * Idempotent: fills blanks only and does not wipe richer local/synced data.
 * Sync pull can still enrich the rows afterward.
 */
export async function bootstrapLocalAccountRecords(
  identity: LocalAccountIdentity,
  options?: { forceDeviceDefaults?: boolean },
): Promise<void> {
  if (!isDatabaseInitialized() || !identity.userId) {
    return;
  }

  const fullName = identity.fullName?.trim() ?? '';
  const email = identity.email?.trim() || null;
  const phone = identity.phone?.trim() || null;

  const existing = await profileRepository.findByUserId(identity.userId);
  if (!existing) {
    await profileRepository.save(identity.userId, {
      fullName,
      email,
      phone,
    });
  } else {
    // Upgrade email-local-part stubs when auth metadata has a real name.
    const nextName = isWeakDisplayName(existing.fullName, existing.email ?? email)
      ? fullName || existing.fullName
      : existing.fullName.trim()
        ? existing.fullName
        : fullName;
    const nextEmail = existing.email ?? email;
    const nextPhone = existing.phone ?? phone;
    if (
      nextName !== existing.fullName ||
      nextEmail !== existing.email ||
      nextPhone !== existing.phone
    ) {
      await profileRepository.save(identity.userId, {
        fullName: nextName,
        email: nextEmail,
        phone: nextPhone,
      });
    }
  }

  if (options?.forceDeviceDefaults) {
    await applyDeviceDefaultsToProfile(identity.userId);
  } else {
    const profile = await profileRepository.findByUserId(identity.userId);
    const defaults = await getDeviceDefaults();
    if (profile && (!profile.countryCode || !profile.languageCode)) {
      await profileRepository.save(identity.userId, {
        countryCode: profile.countryCode ?? defaults.countryCode,
        languageCode: profile.languageCode ?? defaults.languageCode,
        state: profile.state ?? defaults.state,
      });
    }

    const settings = await profileRepository.getSettings(identity.userId);
    if (!settings) {
      await profileRepository.saveSettings(identity.userId, {
        notificationsEnabled: defaults.notificationsEnabled,
      });
      useSettingsStore.getState().setNotificationsEnabled(defaults.notificationsEnabled);
    } else {
      useSettingsStore.getState().hydrateFromSettings(settings);
    }
  }

  const profile = await profileRepository.findByUserId(identity.userId);
  const existingEmergency = await emergencyRepository.findByUserId(identity.userId);
  const resolvedEmail = profile?.email ?? email;
  const canonicalName = resolveAccountDisplayName({
    profileFullName: profile?.fullName,
    emergencyFullName: existingEmergency?.fullName,
    authFullName: fullName,
    email: resolvedEmail,
    fallback: '',
  });

  // Heal profile if it still looks like an email stub but emergency/auth has a real name.
  if (
    profile &&
    canonicalName &&
    isWeakDisplayName(profile.fullName, resolvedEmail) &&
    !isWeakDisplayName(canonicalName, resolvedEmail)
  ) {
    await profileRepository.save(identity.userId, { fullName: canonicalName });
  }

  const nameForEmergency = canonicalName || fullName || profile?.fullName?.trim() || '';
  if (!existingEmergency) {
    await emergencyRepository.save(identity.userId, { fullName: nameForEmergency });
  } else if (
    (!existingEmergency.fullName.trim() ||
      isWeakDisplayName(existingEmergency.fullName, resolvedEmail)) &&
    nameForEmergency &&
    !isWeakDisplayName(nameForEmergency, resolvedEmail)
  ) {
    await emergencyRepository.save(identity.userId, { fullName: nameForEmergency });
  } else if (!existingEmergency.fullName.trim() && nameForEmergency) {
    await emergencyRepository.save(identity.userId, { fullName: nameForEmergency });
  }
}
