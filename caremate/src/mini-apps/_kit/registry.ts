import type { LucideIcon } from 'lucide-react-native';
import { Activity, Baby, CalendarCheck, CalendarHeart, Pill, Syringe } from 'lucide-react-native';

import type { TranslationParams } from '@/domains/localization/i18n/types';

export type MiniAppId =
  | 'vitals-tracker'
  | 'period-tracker'
  | 'pregnancy-tracker'
  | 'immunization-tracker'
  | 'medication-tracker'
  | 'checkup-planner';

export interface MiniAppDefinition {
  id: MiniAppId;
  route: `/(app)/apps/${MiniAppId}`;
  icon: LucideIcon;
  color: string;
  backgroundColor: string;
  available: boolean;
}

type TranslateFn = (key: string, params?: TranslationParams) => string;

export function getMiniAppLabel(id: MiniAppId, t: TranslateFn) {
  return {
    name: t(`apps.registry.${id}.name`),
    description: t(`apps.registry.${id}.description`),
  };
}

export const MINI_APPS: MiniAppDefinition[] = [
  {
    id: 'vitals-tracker',
    route: '/(app)/apps/vitals-tracker',
    icon: Activity,
    color: '#1D4ED8',
    backgroundColor: '#DBEAFE',
    available: true,
  },
  {
    id: 'medication-tracker',
    route: '/(app)/apps/medication-tracker',
    icon: Pill,
    color: '#EA580C',
    backgroundColor: '#FFEDD5',
    available: true,
  },
  {
    id: 'checkup-planner',
    route: '/(app)/apps/checkup-planner',
    icon: CalendarCheck,
    color: '#0F766E',
    backgroundColor: '#CCFBF1',
    available: true,
  },
  {
    id: 'immunization-tracker',
    route: '/(app)/apps/immunization-tracker',
    icon: Syringe,
    color: '#059669',
    backgroundColor: '#D1FAE5',
    available: true,
  },
  {
    id: 'pregnancy-tracker',
    route: '/(app)/apps/pregnancy-tracker',
    icon: Baby,
    color: '#0284C7',
    backgroundColor: '#E0F2FE',
    available: true,
  },
  {
    id: 'period-tracker',
    route: '/(app)/apps/period-tracker',
    icon: CalendarHeart,
    color: '#DB2777',
    backgroundColor: '#FCE7F3',
    available: true,
  },
];
