import { palette } from '@/theme';
import type { OnboardingPriorityId } from './types';

export type OnboardingStepTheme = {
  accent: string;
  soft: string;
  softEnd: string;
  title: string;
  blob: string;
};

export const ONBOARDING_STEP_THEMES: OnboardingStepTheme[] = [
  {
    // Welcome — teal
    accent: palette.primary,
    soft: palette.primaryLight,
    softEnd: '#F0FDFA',
    title: palette.primaryDark,
    blob: '#99F6E4',
  },
  {
    // Priorities — violet wash
    accent: palette.brandPurple,
    soft: palette.purpleLight,
    softEnd: '#F5F3FF',
    title: palette.brandPurpleDark,
    blob: '#DDD6FE',
  },
  {
    // Region — sky
    accent: '#0284C7',
    soft: '#E0F2FE',
    softEnd: '#F0F9FF',
    title: '#0369A1',
    blob: '#7DD3FC',
  },
  {
    // Location — blue
    accent: palette.brandBlue,
    soft: palette.brandBlueLight,
    softEnd: '#EFF6FF',
    title: palette.brandBlue,
    blob: '#BFDBFE',
  },
  {
    // Notifications — amber
    accent: '#D97706',
    soft: '#FEF3C7',
    softEnd: '#FFFBEB',
    title: '#92400E',
    blob: '#FDE68A',
  },
  {
    // Next — teal celebration
    accent: palette.primary,
    soft: palette.primaryLight,
    softEnd: '#ECFDF5',
    title: palette.primaryDark,
    blob: '#6EE7B7',
  },
];

export const PRIORITY_VISUALS: Record<
  OnboardingPriorityId,
  { accent: string; soft: string; softEnd: string }
> = {
  emergency: {
    accent: palette.brandPurple,
    soft: palette.purpleLight,
    softEnd: '#F5F3FF',
  },
  nearby: {
    accent: palette.brandBlue,
    soft: palette.brandBlueLight,
    softEnd: '#EFF6FF',
  },
  family: {
    accent: '#DB2777',
    soft: '#FCE7F3',
    softEnd: '#FDF2F8',
  },
  learn: {
    accent: palette.primary,
    soft: palette.primaryLight,
    softEnd: '#F0FDFA',
  },
};
