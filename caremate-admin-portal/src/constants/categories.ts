export const HEALTH_CATEGORIES = [
  {
    id: 'prevention',
    shortLabel: 'Prevention',
    name: 'Everyday Health & Prevention',
  },
  {
    id: 'conditions',
    shortLabel: 'Conditions',
    name: 'Common Conditions',
  },
  {
    id: 'symptoms',
    shortLabel: 'Symptoms',
    name: 'Symptoms & When to Seek Care',
  },
  {
    id: 'family',
    shortLabel: 'Family',
    name: 'Family Health',
  },
  {
    id: 'emergency',
    shortLabel: 'Emergency',
    name: 'Emergency & First Aid',
  },
  {
    id: 'care_system',
    shortLabel: 'Care system',
    name: 'Healthcare Navigation',
  },
  {
    id: 'medicines',
    shortLabel: 'Medicines',
    name: 'Medicines & Treatments',
  },
  {
    id: 'mental',
    shortLabel: 'Mental health',
    name: 'Mental Health & Well-being',
  },
  {
    id: 'tests',
    shortLabel: 'Tests',
    name: 'Tests & Procedures',
  },
  {
    id: 'nutrition',
    shortLabel: 'Nutrition',
    name: 'Nutrition & Healthy Living',
  },
] as const;

export type HealthCategoryId = (typeof HEALTH_CATEGORIES)[number]['id'];

const LEGACY_HEALTH_CATEGORY_ID_MAP: Record<string, HealthCategoryId> = {
  heart: 'conditions',
  child: 'family',
  pregnancy: 'family',
  mental: 'mental',
  medication: 'medicines',
  nutrition: 'nutrition',
  fitness: 'nutrition',
  infectious: 'conditions',
};

export function normalizeHealthCategoryId(categoryId: string): string {
  const trimmed = categoryId.trim();
  if (!trimmed) {
    return trimmed;
  }
  return LEGACY_HEALTH_CATEGORY_ID_MAP[trimmed] ?? trimmed;
}

/** Full name for forms, tables, and category screens. */
export function categoryName(id: string): string {
  const normalized = normalizeHealthCategoryId(id);
  return HEALTH_CATEGORIES.find((c) => c.id === normalized)?.name ?? id;
}

/** Short chip-style label. */
export function categoryShortLabel(id: string): string {
  const normalized = normalizeHealthCategoryId(id);
  return HEALTH_CATEGORIES.find((c) => c.id === normalized)?.shortLabel ?? id;
}
