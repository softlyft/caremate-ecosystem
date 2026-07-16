import {
  MILESTONES,
  MOOD_OPTIONS,
  SYMPTOM_OPTIONS,
} from '@/mini-apps/pregnancy-tracker/constants';
import type { TranslateFn } from '@/mini-apps/_kit/i18n';
import type { PregnancyMilestone, Trimester } from '@/mini-apps/pregnancy-tracker/utils';

export function localizeMood(mood: string, t: TranslateFn): string {
  return t(`apps.pregnancy.moods.${mood}`) || mood;
}

export function localizeSymptom(symptom: string, t: TranslateFn): string {
  return t(`apps.pregnancy.symptoms.${symptom}`) || symptom;
}

export function localizeMoodOptions(t: TranslateFn) {
  return MOOD_OPTIONS.map((mood) => ({ id: mood, label: localizeMood(mood, t) }));
}

export function localizeSymptomOptions(t: TranslateFn) {
  return SYMPTOM_OPTIONS.map((symptom) => ({ id: symptom, label: localizeSymptom(symptom, t) }));
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
