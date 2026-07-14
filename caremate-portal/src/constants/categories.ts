export const HEALTH_CATEGORIES = [
  { id: 'heart', name: 'Heart Health' },
  { id: 'child', name: 'Child Health' },
  { id: 'pregnancy', name: 'Pregnancy' },
  { id: 'mental', name: 'Mental Health' },
  { id: 'medication', name: 'Medication' },
  { id: 'nutrition', name: 'Nutrition' },
  { id: 'fitness', name: 'Fitness' },
  { id: 'infectious', name: 'Infectious Diseases' },
] as const;

export type HealthCategoryId = (typeof HEALTH_CATEGORIES)[number]['id'];

export function categoryName(id: string): string {
  return HEALTH_CATEGORIES.find((c) => c.id === id)?.name ?? id;
}
