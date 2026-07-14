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
