import { confirm } from '@/components/ui/AppDialogHost';
import {
  getDeviceAccountConflict,
  resetDeviceForNewAccount,
} from '@/domains/auth/device-account-binding';

type DeviceAccountCopy = {
  title: string;
  message: (maskedEmail: string) => string;
  proceed: string;
  cancel: string;
};

/**
 * Before sign-in / sign-up: allow same device email, or confirm a full local reset for a switch.
 * @returns true to continue auth, false if the user cancelled.
 */
export async function confirmDeviceAccountForAuth(
  email: string,
  copy: DeviceAccountCopy,
): Promise<boolean> {
  const conflict = await getDeviceAccountConflict(email);
  if (!conflict) {
    return true;
  }

  const ok = await confirm({
    title: copy.title,
    message: copy.message(conflict.maskedEmail),
    cancelLabel: copy.cancel,
    confirmLabel: copy.proceed,
    confirmVariant: 'destructive',
  });
  if (!ok) {
    return false;
  }

  try {
    await resetDeviceForNewAccount();
    return true;
  } catch {
    return false;
  }
}
