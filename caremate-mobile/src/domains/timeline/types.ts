import type { MiniAppKey } from '@/mini-apps/_kit/snapshot-repository';

export const HEALTH_TIMELINE_KINDS = [
  'vital',
  'med_dose',
  'pregnancy_log',
  'tt_dose',
  'period_day',
  'vaccine',
  'checkup',
] as const;

export type HealthTimelineKind = (typeof HEALTH_TIMELINE_KINDS)[number];

export type HealthTimelineEvent = {
  id: string;
  userId: string;
  appKey: MiniAppKey;
  kind: HealthTimelineKind;
  occurredOn: string;
  occurredAt: string | null;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  updatedAt: string;
};

export type ProjectedTimelineEvent = Omit<HealthTimelineEvent, 'updatedAt'>;
