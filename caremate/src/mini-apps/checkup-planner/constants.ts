export type CheckupCadence =
  'annual' | 'once' | 'every-2-years' | 'every-3-years' | 'every-5-years';

export type CheckupGenderFilter = 'all' | 'male' | 'female';

export type CheckupCategory = 'general' | 'dental' | 'vision' | 'screening' | 'labs';

export interface CheckupDefinition {
  id: string;
  name: string;
  description: string;
  cadence: CheckupCadence;
  minAge: number;
  maxAge?: number;
  gender: CheckupGenderFilter;
  category: CheckupCategory;
  /**
   * Country codes this item is emphasized for.
   * Omit or empty = applies internationally (including INT).
   */
  regions?: string[];
}

/**
 * Practical adult preventive checklist. Educational guidance only — not a diagnosis
 * or a substitute for clinician advice. Ages are approximate international baselines.
 */
export const CHECKUP_CATALOG: CheckupDefinition[] = [
  {
    id: 'general-checkup',
    name: 'General medical checkup',
    description: 'Yearly visit with a clinician for overall health review.',
    cadence: 'annual',
    minAge: 18,
    gender: 'all',
    category: 'general',
  },
  {
    id: 'dental-checkup',
    name: 'Dental checkup',
    description: 'Cleaning and oral exam to catch cavities and gum disease early.',
    cadence: 'annual',
    minAge: 5,
    gender: 'all',
    category: 'dental',
  },
  {
    id: 'eye-exam',
    name: 'Eye / vision exam',
    description: 'Check vision and eye health; more often if you wear glasses or have diabetes.',
    cadence: 'every-2-years',
    minAge: 18,
    gender: 'all',
    category: 'vision',
  },
  {
    id: 'blood-pressure',
    name: 'Blood pressure check',
    description: 'Screen for hypertension — a silent risk for heart disease and stroke.',
    cadence: 'annual',
    minAge: 18,
    gender: 'all',
    category: 'labs',
  },
  {
    id: 'blood-sugar',
    name: 'Blood sugar / diabetes screen',
    description: 'Fasting glucose or HbA1c, especially with family history or excess weight.',
    cadence: 'every-3-years',
    minAge: 35,
    gender: 'all',
    category: 'labs',
  },
  {
    id: 'cholesterol',
    name: 'Cholesterol / lipid panel',
    description: 'Blood test for heart risk. Discuss frequency with your clinician.',
    cadence: 'every-5-years',
    minAge: 40,
    gender: 'all',
    category: 'labs',
  },
  {
    id: 'weight-bmi',
    name: 'Weight & BMI review',
    description: 'Track healthy weight trends as part of your annual checkup.',
    cadence: 'annual',
    minAge: 18,
    gender: 'all',
    category: 'general',
  },
  {
    id: 'flu-vaccine',
    name: 'Seasonal flu vaccination',
    description: 'Yearly flu shot where available and recommended.',
    cadence: 'annual',
    minAge: 6,
    gender: 'all',
    category: 'general',
  },
  {
    id: 'cervical-screening',
    name: 'Cervical screening (Pap / HPV)',
    description: 'Screen for cervical cancer. Follow local guidelines for interval.',
    cadence: 'every-3-years',
    minAge: 25,
    maxAge: 65,
    gender: 'female',
    category: 'screening',
  },
  {
    id: 'mammogram',
    name: 'Mammogram',
    description: 'Breast cancer screening. Start age varies by guideline and risk.',
    cadence: 'every-2-years',
    minAge: 40,
    maxAge: 74,
    gender: 'female',
    category: 'screening',
  },
  {
    id: 'prostate-discussion',
    name: 'Prostate health discussion',
    description: 'Talk with a clinician about PSA testing and prostate symptoms.',
    cadence: 'annual',
    minAge: 50,
    gender: 'male',
    category: 'screening',
  },
  {
    id: 'prostate-earlier',
    name: 'Earlier prostate discussion',
    description:
      'Consider discussing screening earlier if you are of African ancestry or have family history.',
    cadence: 'annual',
    minAge: 45,
    maxAge: 49,
    gender: 'male',
    category: 'screening',
    regions: ['NG', 'GH', 'KE', 'US', 'GB', 'CA'],
  },
  {
    id: 'colorectal-screening',
    name: 'Colorectal cancer screening',
    description: 'Stool test or colonoscopy starting in mid-adulthood — ask which option fits you.',
    cadence: 'every-5-years',
    minAge: 45,
    maxAge: 75,
    gender: 'all',
    category: 'screening',
  },
  {
    id: 'skin-check',
    name: 'Skin check',
    description: 'Review moles and skin changes with a clinician.',
    cadence: 'annual',
    minAge: 18,
    gender: 'all',
    category: 'screening',
  },
  {
    id: 'hearing-check',
    name: 'Hearing check',
    description: 'Screen for age-related hearing loss.',
    cadence: 'every-3-years',
    minAge: 55,
    gender: 'all',
    category: 'general',
  },
  {
    id: 'bone-density-women',
    name: 'Bone density (DEXA)',
    description: 'Screen for osteoporosis risk after menopause / later adulthood.',
    cadence: 'once',
    minAge: 65,
    gender: 'female',
    category: 'screening',
  },
  {
    id: 'bone-density-men',
    name: 'Bone density (DEXA)',
    description: 'Screen for osteoporosis risk in later adulthood.',
    cadence: 'once',
    minAge: 70,
    gender: 'male',
    category: 'screening',
  },
  {
    id: 'tetanus-booster',
    name: 'Tetanus booster review',
    description: 'Confirm tetanus (and related) boosters are up to date — often every 10 years.',
    cadence: 'every-5-years',
    minAge: 18,
    gender: 'all',
    category: 'general',
  },
];

export const GENDER_OPTIONS = [
  { id: 'female' as const, label: 'Female' },
  { id: 'male' as const, label: 'Male' },
  { id: 'other' as const, label: 'Other / prefer not to say' },
];

export function getCadenceLabel(cadence: CheckupCadence): string {
  switch (cadence) {
    case 'annual':
      return 'Every year';
    case 'once':
      return 'Once (when due)';
    case 'every-2-years':
      return 'Every 2 years';
    case 'every-3-years':
      return 'Every 3 years';
    case 'every-5-years':
      return 'Every 5 years';
  }
}

export function getCadenceIntervalYears(cadence: CheckupCadence): number {
  switch (cadence) {
    case 'annual':
      return 1;
    case 'once':
      return 0;
    case 'every-2-years':
      return 2;
    case 'every-3-years':
      return 3;
    case 'every-5-years':
      return 5;
  }
}
