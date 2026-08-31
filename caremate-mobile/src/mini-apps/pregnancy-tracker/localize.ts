import {
  MILESTONES,
  MOOD_OPTIONS,
  POSTPARTUM_SYMPTOM_OPTIONS,
  SYMPTOM_OPTIONS,
} from '@/mini-apps/pregnancy-tracker/constants';
import type { PregnancyAlertCopy } from '@/mini-apps/pregnancy-tracker/alerts';
import type { TranslateFn } from '@/mini-apps/_kit/i18n';
import { pluralKey } from '@/mini-apps/_kit/i18n';
import type { PregnancyMilestone, Trimester } from '@/mini-apps/pregnancy-tracker/utils';

export type PregnancyLogPhase = 'active' | 'postpartum';

export function localizeMood(mood: string, t: TranslateFn): string {
  return t(`apps.pregnancy.moods.${mood}`) || mood;
}

export function localizeSymptom(symptom: string, t: TranslateFn): string {
  return t(`apps.pregnancy.symptoms.${symptom}`) || symptom;
}

export function localizeMoodOptions(t: TranslateFn) {
  return MOOD_OPTIONS.map((mood) => ({ id: mood, label: localizeMood(mood, t) }));
}

export function localizeSymptomOptions(t: TranslateFn, phase: PregnancyLogPhase = 'active') {
  const options = phase === 'postpartum' ? POSTPARTUM_SYMPTOM_OPTIONS : SYMPTOM_OPTIONS;
  return options.map((symptom) => ({ id: symptom, label: localizeSymptom(symptom, t) }));
}

export function localizeMilestone(
  milestone: { week: number; title: string; description: string },
  t: TranslateFn,
) {
  return {
    ...milestone,
    title: t(`apps.pregnancy.milestones.${milestone.week}.title`) || milestone.title,
    description:
      t(`apps.pregnancy.milestones.${milestone.week}.description`) || milestone.description,
  };
}

export function localizeMilestones(t: TranslateFn) {
  return MILESTONES.map((milestone) => localizeMilestone(milestone, t));
}

export function localizePregnancyMilestone(milestone: PregnancyMilestone, t: TranslateFn) {
  return {
    ...milestone,
    ...localizeMilestone(milestone, t),
  };
}

export function localizeTrimester(trimester: Trimester, t: TranslateFn): string {
  return t(`apps.pregnancy.trimester.${trimester}`);
}

export function buildPregnancyAlertCopy(t: TranslateFn): PregnancyAlertCopy {
  return {
    milestoneSoonTitle: (title, week) =>
      t('apps.pregnancy.alerts.milestoneSoonTitle', { title, week }),
    milestoneSoonBody: (title, days) =>
      days <= 0
        ? t('apps.pregnancy.alerts.milestoneSoonThisWeek', { title })
        : t(pluralKey('apps.pregnancy.alerts.milestoneSoonBody', days), { title, count: days }),
    dueSoonTitle: (name, days) =>
      t(pluralKey('apps.pregnancy.alerts.dueSoonTitle', days), { name, count: days }),
    dueSoonBody: (name, days) =>
      t(pluralKey('apps.pregnancy.alerts.dueSoonBody', days), { name, count: days }),
    dueTodayTitle: (name) => t('apps.pregnancy.alerts.dueTodayTitle', { name }),
    dueTodayBody: (name) => t('apps.pregnancy.alerts.dueTodayBody', { name }),
    pastDueTitle: (name, days) =>
      t(pluralKey('apps.pregnancy.alerts.pastDueTitle', days), { name, count: days }),
    pastDueBody: (name, days) =>
      t(pluralKey('apps.pregnancy.alerts.pastDueBody', days), { name, count: days }),
    dailyNudgeTitle: () => t('apps.pregnancy.alerts.dailyNudgeTitle'),
    dailyNudgeBody: () => t('apps.pregnancy.alerts.dailyNudgeBody'),
    ttDoseDueTitle: () => t('apps.pregnancy.alerts.ttDoseDueTitle'),
    ttDoseDueBody: () => t('apps.pregnancy.alerts.ttDoseDueBody'),
  };
}
