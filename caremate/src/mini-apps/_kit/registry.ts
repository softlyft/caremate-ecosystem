import type { LucideIcon } from 'lucide-react-native';
import { Baby, CalendarCheck, CalendarHeart, Pill, Syringe } from 'lucide-react-native';

export type MiniAppId =
  | 'period-tracker'
  | 'pregnancy-tracker'
  | 'immunization-tracker'
  | 'medication-tracker'
  | 'checkup-planner';

export interface MiniAppDefinition {
  id: MiniAppId;
  name: string;
  description: string;
  route: `/(app)/apps/${MiniAppId}`;
  icon: LucideIcon;
  color: string;
  backgroundColor: string;
  available: boolean;
}

export const MINI_APPS: MiniAppDefinition[] = [
  {
    id: 'medication-tracker',
    name: 'Medication Tracker',
    description: 'Track medicines, daily doses, and adherence for you or your family.',
    route: '/(app)/apps/medication-tracker',
    icon: Pill,
    color: '#EA580C',
    backgroundColor: '#FFEDD5',
    available: true,
  },
  {
    id: 'checkup-planner',
    name: 'Checkup Planner',
    description: 'See recommended medical checkups by age, gender, and region.',
    route: '/(app)/apps/checkup-planner',
    icon: CalendarCheck,
    color: '#0F766E',
    backgroundColor: '#CCFBF1',
    available: true,
  },
  {
    id: 'immunization-tracker',
    name: 'Immunization Tracker',
    description: "Track vaccines, due dates, and your child's immunization record.",
    route: '/(app)/apps/immunization-tracker',
    icon: Syringe,
    color: '#059669',
    backgroundColor: '#D1FAE5',
    available: true,
  },
  {
    id: 'pregnancy-tracker',
    name: 'Pregnancy Tracker',
    description: 'Follow your pregnancy week by week, log symptoms, and track milestones.',
    route: '/(app)/apps/pregnancy-tracker',
    icon: Baby,
    color: '#0284C7',
    backgroundColor: '#E0F2FE',
    available: true,
  },
  {
    id: 'period-tracker',
    name: 'Period Tracker',
    description: 'Track cycles, log period days, and see simple predictions.',
    route: '/(app)/apps/period-tracker',
    icon: CalendarHeart,
    color: '#DB2777',
    backgroundColor: '#FCE7F3',
    available: true,
  },
];
