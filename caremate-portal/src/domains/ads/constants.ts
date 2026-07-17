export const AD_SLOT_IDS = [
  'home.tips',
  'home.feed',
  'learn.list',
  'learn.article_header',
  'learn.article_footer',
  'nearby.list',
  'nearby.provider',
  'pregnancy.timeline',
  'pregnancy.footer',
  'period.week',
  'period.footer',
] as const;

export type AdSlotMode = 'off' | 'house' | 'sponsored' | 'admob';
