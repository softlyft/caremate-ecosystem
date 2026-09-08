export const PREGNANCY_WEEKS = 40;
export const PREGNANCY_DAYS = PREGNANCY_WEEKS * 7;

export const MOOD_OPTIONS = ['Happy', 'Calm', 'Tired', 'Anxious', 'Excited', 'Unwell'] as const;

export const SYMPTOM_OPTIONS = [
  'Nausea',
  'Fatigue',
  'Back pain',
  'Cramping',
  'Heartburn',
  'Swelling',
  'Headache',
  'Insomnia',
  'Food cravings',
] as const;

/** Common recovery symptoms. Bleeding keeps this id so older logs still match. */
export const POSTPARTUM_ROUTINE_SYMPTOMS = [
  'Fatigue',
  'Afterpains',
  'Bleeding',
  'Perineal discomfort',
  'Breast engorgement',
  'Breast/nipple pain',
  'Incision pain',
  'Back pain',
  'Headache',
  'Pelvic or abdominal pain',
  'Constipation',
  'Insomnia',
  'Anxiety',
  'Mood swings',
] as const;

/**
 * Signs that may need clinic or urgent care. Logged as details, not a diagnosis.
 * Educational guidance only — the app does not decide whether care is required.
 */
export const POSTPARTUM_WARNING_SYMPTOMS = [
  'Fever/chills',
  'Painful/difficult urination',
  'Foul-smelling vaginal discharge',
  'Breast redness or warmth',
  'Dizziness',
  'Leg swelling or leg pain',
  'Shortness of breath',
  'Chest pain',
  'Severe headache or vision changes',
  'Incision/wound problems',
  'Feeling overwhelmed or unusually sad',
] as const;

/** These should prompt urgent-care wording, not only a clinic check. */
export const POSTPARTUM_URGENT_SYMPTOMS = [
  'Shortness of breath',
  'Chest pain',
  'Severe headache or vision changes',
] as const;

/** Recovery-focused options for mother postpartum daily logs (no pregnancy-only items). */
export const POSTPARTUM_SYMPTOM_OPTIONS = [
  ...POSTPARTUM_ROUTINE_SYMPTOMS,
  ...POSTPARTUM_WARNING_SYMPTOMS,
] as const;

export const LOCHIA_AMOUNTS = ['light', 'moderate', 'heavy'] as const;
export type LochiaAmount = (typeof LOCHIA_AMOUNTS)[number];

export type PostpartumSymptomDetails = {
  lochiaAmount?: LochiaAmount;
  lochiaClots?: boolean;
};

export const MILESTONES = [
  {
    week: 8,
    title: 'First prenatal visit',
    description: 'Schedule your first check-up with your provider.',
  },
  {
    week: 12,
    title: 'End of first trimester',
    description: 'Risk of miscarriage drops significantly.',
  },
  { week: 20, title: 'Anatomy scan', description: 'Mid-pregnancy ultrasound around 18–22 weeks.' },
  {
    week: 28,
    title: 'Third trimester begins',
    description: 'Baby is growing quickly — rest when you can.',
  },
  {
    week: 36,
    title: 'Weekly check-ins',
    description: 'Your provider may want to see you more often.',
  },
  { week: 40, title: 'Due date', description: 'Your estimated delivery date.' },
] as const;
