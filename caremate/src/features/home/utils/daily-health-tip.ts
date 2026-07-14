import healthTipsData from '@/features/home/data/health-tips.json';
import { HEALTH_CATEGORIES } from '@/features/home/constants';

export type HealthTipCategoryId = (typeof HEALTH_CATEGORIES)[number]['id'];

export interface DailyHealthTipResult {
  categoryId: HealthTipCategoryId;
  categoryName: string;
  emoji: string;
  tip: string;
  tipIndex: number;
}

const TIPS_BY_CATEGORY = healthTipsData as Record<HealthTipCategoryId, string[]>;

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function getDayOfYear(date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getDailyHealthTip(userKey = 'guest', date = new Date()): DailyHealthTipResult {
  const categories = HEALTH_CATEGORIES;
  const day = getDayOfYear(date);
  const userHash = hashString(userKey);
  const categoryIndex = (day + userHash) % categories.length;
  const category = categories[categoryIndex];
  const tips = TIPS_BY_CATEGORY[category.id] ?? [];
  const tipIndex = tips.length > 0 ? (day + userHash) % tips.length : 0;

  return {
    categoryId: category.id,
    categoryName: category.name,
    emoji: category.emoji,
    tip: tips[tipIndex] ?? 'Stay hydrated and take care of your health today.',
    tipIndex,
  };
}

export function getHealthTipsForCategory(categoryId: HealthTipCategoryId): string[] {
  return TIPS_BY_CATEGORY[categoryId] ?? [];
}
