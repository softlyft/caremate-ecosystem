/**
 * Learn topic categories.
 * - `shortLabel` — chip / compact UI
 * - `name` — category screen title, Learn filter eyebrow, admin, persisted category_name
 */

export const HEALTH_CATEGORIES = [
  {
    id: 'prevention',
    shortLabel: 'Prevention',
    name: 'Everyday Health & Prevention',
    emoji: '🛡️',
    color: '#DCFCE7',
    accent: '#16A34A',
    slug: 'prevention',
  },
  {
    id: 'conditions',
    shortLabel: 'Conditions',
    name: 'Common Conditions',
    emoji: '🩺',
    color: '#FEE2E2',
    accent: '#DC2626',
    slug: 'conditions',
  },
  {
    id: 'symptoms',
    shortLabel: 'Symptoms',
    name: 'Symptoms & When to Seek Care',
    emoji: '🌡️',
    color: '#FFEDD5',
    accent: '#EA580C',
    slug: 'symptoms',
  },
  {
    id: 'family',
    shortLabel: 'Family',
    name: 'Family Health',
    emoji: '👨‍👩‍👧',
    color: '#DBEAFE',
    accent: '#2563EB',
    slug: 'family',
  },
  {
    id: 'emergency',
    shortLabel: 'Emergency',
    name: 'Emergency & First Aid',
    emoji: '🚑',
    color: '#FEE2E2',
    accent: '#B91C1C',
    slug: 'emergency',
  },
  {
    id: 'care_system',
    shortLabel: 'Care system',
    name: 'Healthcare Navigation',
    emoji: '🏥',
    color: '#E0E7FF',
    accent: '#4F46E5',
    slug: 'care_system',
  },
  {
    id: 'medicines',
    shortLabel: 'Medicines',
    name: 'Medicines & Treatments',
    emoji: '💊',
    color: '#FFEDD5',
    accent: '#C2410C',
    slug: 'medicines',
  },
  {
    id: 'mental',
    shortLabel: 'Mental health',
    name: 'Mental Health & Well-being',
    emoji: '🧠',
    color: '#EDE9FE',
    accent: '#7C3AED',
    slug: 'mental',
  },
  {
    id: 'tests',
    shortLabel: 'Tests',
    name: 'Tests & Procedures',
    emoji: '🔬',
    color: '#E0F2FE',
    accent: '#0284C7',
    slug: 'tests',
  },
  {
    id: 'nutrition',
    shortLabel: 'Nutrition',
    name: 'Nutrition & Healthy Living',
    emoji: '🥗',
    color: '#CCFBF1',
    accent: '#0D9488',
    slug: 'nutrition',
  },
] as const;

export type HealthCategoryId = (typeof HEALTH_CATEGORIES)[number]['id'];

export type HealthCategory = (typeof HEALTH_CATEGORIES)[number];

/** Previous taxonomy → current ids (content + subscriptions). */
export const LEGACY_HEALTH_CATEGORY_ID_MAP: Record<string, HealthCategoryId> = {
  heart: 'conditions',
  child: 'family',
  pregnancy: 'family',
  mental: 'mental',
  medication: 'medicines',
  nutrition: 'nutrition',
  fitness: 'nutrition',
  infectious: 'conditions',
};

export function isHealthCategoryId(value: string): value is HealthCategoryId {
  return HEALTH_CATEGORIES.some((category) => category.id === value);
}

export function normalizeHealthCategoryId(categoryId: string): string {
  const trimmed = categoryId.trim();
  if (!trimmed) {
    return trimmed;
  }
  return LEGACY_HEALTH_CATEGORY_ID_MAP[trimmed] ?? trimmed;
}

/** Canonical id plus legacy ids that remap to it (for SQLite / remote queries). */
export function healthCategoryIdsForQuery(canonicalId: string): string[] {
  const normalized = normalizeHealthCategoryId(canonicalId);
  const legacy = Object.entries(LEGACY_HEALTH_CATEGORY_ID_MAP)
    .filter(([, next]) => next === normalized)
    .map(([oldId]) => oldId);
  return [normalized, ...legacy.filter((id) => id !== normalized)];
}

export function getHealthCategory(
  categoryId: string | null | undefined,
): HealthCategory | undefined {
  if (!categoryId) {
    return undefined;
  }
  const normalized = normalizeHealthCategoryId(categoryId);
  return HEALTH_CATEGORIES.find((category) => category.id === normalized);
}

export function getHealthCategoryName(
  categoryId: string | null | undefined,
  fallback = '',
): string {
  return getHealthCategory(categoryId)?.name ?? fallback;
}

export function getHealthCategoryShortLabel(
  categoryId: string | null | undefined,
  fallback = '',
): string {
  return getHealthCategory(categoryId)?.shortLabel ?? fallback;
}

export function estimateReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(3, Math.round(words / 200));
}

export const ARTICLE_THUMBNAILS: Record<string, string> = {
  'article-1': '#FCA5A5',
  'article-2': '#86EFAC',
  'article-3': '#93C5FD',
};
