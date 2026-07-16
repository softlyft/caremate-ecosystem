export const AD_SLOT_IDS = [
  'home.tips',
  'home.feed',
  'learn.list',
  'learn.article_header',
  'learn.article_footer',
  'nearby.list',
  'nearby.provider',
] as const;

export type AdSlotMode = 'off' | 'house' | 'sponsored' | 'admob';
