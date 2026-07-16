import type { MiniAppDefinition, MiniAppId } from '@/mini-apps/_kit/registry';
import { MINI_APPS } from '@/mini-apps/_kit/registry';

export type MiniAppTheme = MiniAppDefinition & {
  softEnd: string;
  titleColor: string;
  subtitleColor: string;
};

const TITLE_TONES: Record<MiniAppId, { title: string; subtitle: string; softEnd: string }> = {
  'medication-tracker': {
    title: '#9A3412',
    subtitle: '#C2410C',
    softEnd: '#FFF7ED',
  },
  'checkup-planner': {
    title: '#134E4A',
    subtitle: '#0F766E',
    softEnd: '#F0FDFA',
  },
  'immunization-tracker': {
    title: '#065F46',
    subtitle: '#047857',
    softEnd: '#ECFDF5',
  },
  'pregnancy-tracker': {
    title: '#075985',
    subtitle: '#0369A1',
    softEnd: '#F0F9FF',
  },
  'period-tracker': {
    title: '#831843',
    subtitle: '#9D174D',
    softEnd: '#FDF2F8',
  },
};

export function getMiniAppTheme(id: MiniAppId): MiniAppTheme {
  const app = MINI_APPS.find((entry) => entry.id === id);
  if (!app) {
    throw new Error(`Unknown mini-app: ${id}`);
  }
  const tones = TITLE_TONES[id];
  return {
    ...app,
    softEnd: tones.softEnd,
    titleColor: tones.title,
    subtitleColor: tones.subtitle,
  };
}
