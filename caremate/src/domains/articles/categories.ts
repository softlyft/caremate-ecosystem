export const HEALTH_CATEGORIES = [
  { id: 'heart', name: 'Heart Health', emoji: '❤️', color: '#FEE2E2', slug: 'heart' },
  { id: 'child', name: 'Child Health', emoji: '👶', color: '#DBEAFE', slug: 'child' },
  { id: 'pregnancy', name: 'Pregnancy', emoji: '🤰', color: '#FCE7F3', slug: 'pregnancy' },
  { id: 'mental', name: 'Mental Health', emoji: '🧠', color: '#EDE9FE', slug: 'mental' },
  { id: 'medication', name: 'Medication', emoji: '💊', color: '#FFEDD5', slug: 'medication' },
  { id: 'nutrition', name: 'Nutrition', emoji: '🥗', color: '#CCFBF1', slug: 'nutrition' },
  { id: 'fitness', name: 'Fitness', emoji: '🏃', color: '#E0F2FE', slug: 'fitness' },
  {
    id: 'infectious',
    name: 'Infectious Diseases',
    emoji: '🦠',
    color: '#FEF3C7',
    slug: 'infectious',
  },
] as const;

export function estimateReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(3, Math.round(words / 200));
}

export const ARTICLE_THUMBNAILS: Record<string, string> = {
  'article-1': '#FCA5A5',
  'article-2': '#86EFAC',
  'article-3': '#93C5FD',
};
