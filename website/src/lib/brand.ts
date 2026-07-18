export const APP_STORE_URLS = {
  ios: 'https://apps.apple.com/app/caremate',
  android: 'https://play.google.com/store/apps/details?id=com.softlyft.caremate',
} as const;

export const BRAND = {
  name: 'CareMate',
  tagline: 'Your health journey, organized.',
} as const;

export const CORE_FEATURES = [
  {
    id: 'emergency',
    title: 'Emergency profile',
    description:
      'Blood group, genotype, allergies, medications, and ICE contacts — available offline and shareable when it counts.',
    accent: '#0D9488',
    soft: '#CCFBF1',
  },
  {
    id: 'learn',
    title: 'Learn',
    description:
      'Trusted health articles by category, with bookmarks and reading progress that stay on your device.',
    accent: '#2563EB',
    soft: '#DBEAFE',
  },
  {
    id: 'nearby',
    title: 'Nearby care',
    description:
      'Find hospitals, pharmacies, labs, and clinics around you — browse details and save favorites.',
    accent: '#0284C7',
    soft: '#E0F2FE',
  },
  {
    id: 'family',
    title: 'Family & profile',
    description:
      'Household kids, spouse connection, Patient ID, and preferences that sync when you are signed in.',
    accent: '#7C3AED',
    soft: '#F3E8FF',
  },
] as const;

export const MINI_APPS = [
  {
    id: 'vitals',
    name: 'Vitals',
    description: 'Log blood pressure, sugar, heart rate, temperature, weight, and more — your health balance at a glance.',
    accent: '#1D4ED8',
    soft: '#DBEAFE',
  },
  {
    id: 'medication',
    name: 'Medication Assistant',
    description: 'Schedule doses, confirm what you took, track refills, and get in-app due and missed reminders.',
    accent: '#EA580C',
    soft: '#FFEDD5',
  },
  {
    id: 'checkup',
    name: 'Checkup Planner',
    description: 'Age-, gender-, and region-aware checkup checklists for this year and next.',
    accent: '#0F766E',
    soft: '#CCFBF1',
  },
  {
    id: 'immunization',
    name: 'Immunization Tracker',
    description: 'Childhood vaccine schedules, due dates, and dose logs tied to kids in your family profile.',
    accent: '#059669',
    soft: '#D1FAE5',
  },
  {
    id: 'pregnancy',
    name: 'Pregnancy Tracker',
    description: 'Follow pregnancy week by week, log symptoms and mood, and keep milestones in one place.',
    accent: '#0284C7',
    soft: '#E0F2FE',
  },
  {
    id: 'period',
    name: 'Period Tracker',
    description: 'Mark period days, see cycle length, and get simple predictions for what comes next.',
    accent: '#DB2777',
    soft: '#FCE7F3',
  },
] as const;
