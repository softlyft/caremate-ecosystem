import { Alert } from 'react-native';

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

  return new Promise((resolve) => {
    Alert.alert(copy.title, copy.message(conflict.maskedEmail), [
      {
        text: copy.cancel,
        style: 'cancel',
        onPress: () => resolve(false),
      },
      {
        text: copy.proceed,
        style: 'destructive',
        onPress: () => {
          void resetDeviceForNewAccount()
            .then(() => resolve(true))
            .catch(() => resolve(false));
        },
      },
    ]);
  });
}
