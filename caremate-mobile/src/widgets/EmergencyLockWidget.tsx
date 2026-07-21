import Constants, { ExecutionEnvironment } from 'expo-constants';

import type { EmergencyLockWidgetApi } from '@/widgets/emergency-lock-widget-types';

export type { EmergencyLockWidgetProps } from '@/widgets/emergency-lock-widget-types';

const stubWidget: EmergencyLockWidgetApi = {
  updateSnapshot() {
    // Expo Go / web: native widgets are unavailable.
  },
  reload() {},
};

function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

function loadWidget(): EmergencyLockWidgetApi {
  if (isExpoGo()) {
    return stubWidget;
  }

  try {
    // Native module only exists in development/production builds.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('./EmergencyLockWidget.impl').default as EmergencyLockWidgetApi;
  } catch {
    return stubWidget;
  }
}

const EmergencyLockWidget = loadWidget();

export default EmergencyLockWidget;
