import { STORAGE_KEYS } from '@/constants/config';
import { wipeLocalAccountData } from '@/domains/auth/wipe-local-account';
import { authStorage } from '@/lib/storage';

export type DeviceAccountBinding = {
  email: string;
  userId: string;
};

export function normalizeAccountEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf('@');
  if (at <= 0 || at === normalized.length - 1) {
    return normalized;
  }

  let local = normalized.slice(0, at);
  let domain = normalized.slice(at + 1);

  if (domain === 'googlemail.com') {
    domain = 'gmail.com';
  }

  if (domain === 'gmail.com') {
    const plus = local.indexOf('+');
    if (plus >= 0) {
      local = local.slice(0, plus);
    }
    local = local.replace(/\./g, '');
  }

  return `${local}@${domain}`;
}

/** Trim + lower only — used as a login fallback for accounts created before Gmail canonicalization. */
export function legacyNormalizeAccountEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Mask for switch prompts, e.g. `jo***@g***.com`. */
export function maskAccountEmail(email: string): string {
  const normalized = normalizeAccountEmail(email);
  const at = normalized.indexOf('@');
  if (at <= 0 || at === normalized.length - 1) {
    return '***';
  }

  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  const localMask = local.length <= 2 ? `${local[0] ?? '*'}***` : `${local.slice(0, 2)}***`;

  const lastDot = domain.lastIndexOf('.');
  const domainName = lastDot > 0 ? domain.slice(0, lastDot) : domain;
  const tld = lastDot > 0 ? domain.slice(lastDot + 1) : '';
  const domainMask = domainName.length > 0 ? `${domainName[0]}***` : '***';

  return tld ? `${localMask}@${domainMask}.${tld}` : `${localMask}@${domainMask}`;
}

export async function getDeviceAccountBinding(): Promise<DeviceAccountBinding | null> {
  const raw = await authStorage.getItem(STORAGE_KEYS.deviceAccountBinding);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<DeviceAccountBinding>;
    if (
      typeof parsed.email === 'string' &&
      parsed.email.includes('@') &&
      typeof parsed.userId === 'string' &&
      parsed.userId.length > 0
    ) {
      return {
        email: normalizeAccountEmail(parsed.email),
        userId: parsed.userId,
      };
    }
  } catch {
    // Corrupt binding — treat as unbound.
  }

  return null;
}

export async function setDeviceAccountBinding(binding: DeviceAccountBinding): Promise<void> {
  await authStorage.setItem(
    STORAGE_KEYS.deviceAccountBinding,
    JSON.stringify({
      email: normalizeAccountEmail(binding.email),
      userId: binding.userId,
    }),
  );
}

export async function clearDeviceAccountBinding(): Promise<void> {
  await authStorage.removeItem(STORAGE_KEYS.deviceAccountBinding);
}

export type DeviceAccountConflict = {
  maskedEmail: string;
  boundEmail: string;
  boundUserId: string;
};

/** Returns a conflict when this device is bound to a different email. */
export async function getDeviceAccountConflict(
  email: string,
): Promise<DeviceAccountConflict | null> {
  const binding = await getDeviceAccountBinding();
  if (!binding) {
    return null;
  }

  const next = normalizeAccountEmail(email);
  if (binding.email === next) {
    return null;
  }

  return {
    maskedEmail: maskAccountEmail(binding.email),
    boundEmail: binding.email,
    boundUserId: binding.userId,
  };
}

/**
 * Wipe the previously bound account’s local data and clear the device binding.
 * Call only after the user confirms switching accounts on this device.
 */
export async function resetDeviceForNewAccount(): Promise<void> {
  const binding = await getDeviceAccountBinding();
  if (binding?.userId) {
    await wipeLocalAccountData(binding.userId);
  }
  await clearDeviceAccountBinding();
}

/**
 * Persist the signed-in account on this device.
 * If the same email returns under a new userId (rare recreate), wipe the old local rows first.
 */
export async function bindDeviceAccount(
  userId: string,
  email: string | null | undefined,
): Promise<void> {
  if (!userId || !email?.includes('@')) {
    return;
  }

  const normalized = normalizeAccountEmail(email);
  const existing = await getDeviceAccountBinding();
  if (existing && existing.email === normalized && existing.userId !== userId) {
    await wipeLocalAccountData(existing.userId);
  }

  await setDeviceAccountBinding({ email: normalized, userId });
}
