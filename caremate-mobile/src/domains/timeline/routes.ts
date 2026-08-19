import type { MiniAppKey } from '@/mini-apps/_kit/snapshot-repository';
import type { MiniAppId } from '@/mini-apps/_kit/registry';

export const HEALTH_TIMELINE_APP_IDS: Record<MiniAppKey, MiniAppId> = {
  vitals: 'vitals-tracker',
  medication: 'medication-tracker',
  pregnancy: 'pregnancy-tracker',
  period: 'period-tracker',
  immunization: 'immunization-tracker',
  checkup: 'checkup-planner',
};

export const HEALTH_TIMELINE_APP_ROUTES: Record<MiniAppKey, `/(app)/apps/${MiniAppId}`> = {
  vitals: '/(app)/apps/vitals-tracker',
  medication: '/(app)/apps/medication-tracker',
  pregnancy: '/(app)/apps/pregnancy-tracker',
  period: '/(app)/apps/period-tracker',
  immunization: '/(app)/apps/immunization-tracker',
  checkup: '/(app)/apps/checkup-planner',
};
