/**
 * Learn content model (Phase 1 = articles; Phase 2 extends kinds below).
 * One core row + `contentType` discriminant + `attributes` JSON for kind-specific fields.
 */

export const LEARN_CONTENT_TYPES = [
  'article',
  'video',
  'podcast',
  'campaign',
  'health_alert',
  'faq',
  'guide',
] as const;

export type LearnContentType = (typeof LEARN_CONTENT_TYPES)[number];

/** Primary Learn filters / tabs once Phase 2 ships (order = UI). */
export const PRIMARY_LEARN_CONTENT_TYPES = [
  'article',
  'video',
  'podcast',
  'guide',
  'faq',
  'campaign',
  'health_alert',
] as const satisfies readonly LearnContentType[];

export const LEARN_CONTENT_TYPE_LABELS: Record<LearnContentType, string> = {
  article: 'Article',
  video: 'Video',
  podcast: 'Podcast',
  campaign: 'Campaign',
  health_alert: 'Health Alert',
  faq: 'FAQ',
  guide: 'Guide',
};

export function isLearnContentType(value: string): value is LearnContentType {
  return (LEARN_CONTENT_TYPES as readonly string[]).includes(value);
}

export function formatLearnContentType(type: string): string {
  if (isLearnContentType(type)) {
    return LEARN_CONTENT_TYPE_LABELS[type];
  }
  return type.replace(/_/g, ' ');
}

/**
 * Type-specific bags (convention — not fully enforced in TS yet).
 *
 * article:      { readingMinutes?: number; author?: string }
 * video:        { mediaUrl: string; durationSec?: number; transcriptUrl?: string; thumbnailUrl?: string }
 * podcast:      { audioUrl: string; durationSec?: number; episodeNumber?: number; showName?: string }
 * campaign:     { startsAt?: string; endsAt?: string; ctaLabel?: string; ctaUrl?: string; sponsor?: string }
 * health_alert: { severity?: 'info' | 'warning' | 'critical'; expiresAt?: string; regionCodes?: string[] }
 * faq:          { question: string; answerHtml?: string; relatedIds?: string[] }
 * guide:        { steps?: Array<{ title: string; body: string }>; estimatedMinutes?: number }
 */
export type LearnContentAttributes = Record<string, unknown>;
