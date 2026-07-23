import type { EmergencyLockWidgetApi } from '@/widgets/emergency-lock-widget-types';

export type { EmergencyLockWidgetProps } from '@/widgets/emergency-lock-widget-types';

/**
 * Lock/home widgets are retired. Kept as a no-op API so
 * `syncEmergencyLockSurface` can clear without a native iOS extension.
 */
const stubWidget: EmergencyLockWidgetApi = {
  updateSnapshot() {},
  reload() {},
};

export default stubWidget;
