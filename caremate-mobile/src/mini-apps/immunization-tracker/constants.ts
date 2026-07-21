export interface VaccineDefinition {
  id: string;
  name: string;
  doseLabel: string;
  recommendedAgeWeeks: number;
  description: string;
}

export const VACCINE_SCHEDULE: VaccineDefinition[] = [
  {
    id: 'bcg',
    name: 'BCG',
    doseLabel: 'Birth dose',
    recommendedAgeWeeks: 0,
    description: 'Protects against severe forms of tuberculosis.',
  },
  {
    id: 'hep-b-birth',
    name: 'Hepatitis B',
    doseLabel: 'Birth dose',
    recommendedAgeWeeks: 0,
    description: 'First dose given at birth or within 24 hours.',
  },
  {
    id: 'opv-0',
    name: 'Polio (OPV)',
    doseLabel: 'Dose 0',
    recommendedAgeWeeks: 0,
    description: 'Birth dose of oral polio vaccine.',
  },
  {
    id: 'penta-1',
    name: 'Pentavalent',
    doseLabel: 'Dose 1',
    recommendedAgeWeeks: 6,
    description: 'Covers diphtheria, tetanus, pertussis, hepatitis B, and Hib.',
  },
  {
    id: 'opv-1',
    name: 'Polio (OPV)',
    doseLabel: 'Dose 1',
    recommendedAgeWeeks: 6,
    description: 'First routine polio dose.',
  },
  {
    id: 'pcv-1',
    name: 'Pneumococcal (PCV)',
    doseLabel: 'Dose 1',
    recommendedAgeWeeks: 6,
    description: 'Protects against pneumococcal disease.',
  },
  {
    id: 'rota-1',
    name: 'Rotavirus',
    doseLabel: 'Dose 1',
    recommendedAgeWeeks: 6,
    description: 'Protects against severe diarrhoea from rotavirus.',
  },
  {
    id: 'penta-2',
    name: 'Pentavalent',
    doseLabel: 'Dose 2',
    recommendedAgeWeeks: 10,
    description: 'Second pentavalent dose.',
  },
  {
    id: 'opv-2',
    name: 'Polio (OPV)',
    doseLabel: 'Dose 2',
    recommendedAgeWeeks: 10,
    description: 'Second routine polio dose.',
  },
  {
    id: 'pcv-2',
    name: 'Pneumococcal (PCV)',
    doseLabel: 'Dose 2',
    recommendedAgeWeeks: 10,
    description: 'Second pneumococcal dose.',
  },
  {
    id: 'rota-2',
    name: 'Rotavirus',
    doseLabel: 'Dose 2',
    recommendedAgeWeeks: 10,
    description: 'Second rotavirus dose.',
  },
  {
    id: 'penta-3',
    name: 'Pentavalent',
    doseLabel: 'Dose 3',
    recommendedAgeWeeks: 14,
    description: 'Third pentavalent dose.',
  },
  {
    id: 'opv-3',
    name: 'Polio (OPV)',
    doseLabel: 'Dose 3',
    recommendedAgeWeeks: 14,
    description: 'Third routine polio dose.',
  },
  {
    id: 'pcv-3',
    name: 'Pneumococcal (PCV)',
    doseLabel: 'Dose 3',
    recommendedAgeWeeks: 14,
    description: 'Third pneumococcal dose.',
  },
  {
    id: 'ipv',
    name: 'Polio (IPV)',
    doseLabel: 'Booster',
    recommendedAgeWeeks: 26,
    description: 'Inactivated polio booster around 6 months.',
  },
  {
    id: 'measles-1',
    name: 'Measles / MR',
    doseLabel: 'Dose 1',
    recommendedAgeWeeks: 39,
    description: 'First measles-rubella dose around 9 months.',
  },
  {
    id: 'yellow-fever',
    name: 'Yellow Fever',
    doseLabel: 'Single dose',
    recommendedAgeWeeks: 39,
    description: 'Recommended in endemic regions from 9 months.',
  },
  {
    id: 'measles-2',
    name: 'Measles / MR',
    doseLabel: 'Dose 2',
    recommendedAgeWeeks: 65,
    description: 'Second measles-rubella dose around 15 months.',
  },
  {
    id: 'vitamin-a',
    name: 'Vitamin A',
    doseLabel: 'Supplement',
    recommendedAgeWeeks: 65,
    description: 'Routine vitamin A supplementation from 15 months.',
  },
];
