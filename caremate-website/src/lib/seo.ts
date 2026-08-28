import { SITE_URL, BRAND, PHIN } from '@/lib/brand';

export const DEFAULT_OG_IMAGE = `${SITE_URL}/caremate-homepage.png`;
export const DEFAULT_DESCRIPTION =
  'CareMate — your Personal Health Intelligence Network (PHIN). Offline-first emergency profile, nearby care, Learn, and mini-apps for vitals, medication, checkups, immunization, pregnancy, and periods.';

export type PageSeo = {
  title: string;
  description: string;
  path: string;
  /** When true, search engines should not index (auth / deep-link landings). */
  noIndex?: boolean;
  ogType?: 'website' | 'article';
  image?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

function titleWithBrand(pageTitle: string): string {
  if (pageTitle.includes(BRAND.name)) {
    return pageTitle;
  }
  return `${pageTitle} — ${BRAND.name}`;
}

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${normalized === '/' ? '/' : normalized.replace(/\/$/, '') || '/'}`;
}

export function organizationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND.name,
    alternateName: PHIN.acronym,
    url: SITE_URL,
    logo: `${SITE_URL}/caremate-logo.png`,
    email: 'hello@getcaremate.com',
    description: DEFAULT_DESCRIPTION,
    sameAs: [
      'https://apps.apple.com/app/caremate',
      'https://play.google.com/store/apps/details?id=com.softlyft.caremate',
    ],
  };
}

export function websiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: BRAND.name,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    publisher: {
      '@type': 'Organization',
      name: BRAND.name,
      url: SITE_URL,
    },
  };
}

export function softwareApplicationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: BRAND.name,
    applicationCategory: 'HealthApplication',
    operatingSystem: 'iOS, Android',
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };
}

/** Static marketing routes (article/category SEO is built in-page). */
export const STATIC_PAGE_SEO: Record<string, Omit<PageSeo, 'path'>> = {
  '/': {
    title: `${BRAND.name} — ${PHIN.label}`,
    description: DEFAULT_DESCRIPTION,
    jsonLd: [organizationJsonLd(), websiteJsonLd(), softwareApplicationJsonLd()],
  },
  '/pricing': {
    title: titleWithBrand('Pricing'),
    description:
      'CareMate Free, Premium, and Family plans. Compare features for emergency profile, Learn, trackers, and household care.',
  },
  '/providers/pricing': {
    title: titleWithBrand('Care Portal plans'),
    description:
      'Private Care Team for healthcare providers — Free, Basic, Pro, and Enterprise. Org Messages stay free; Paystack NGN checkout.',
  },
  '/payers/pricing': {
    title: titleWithBrand('Payer Support Team plans'),
    description:
      'Support Team for health insurers and payers — Free, Basic, Pro, and Enterprise. Text and voice chat; Pro adds group coordination. Paystack NGN.',
  },
  '/providers': {
    title: titleWithBrand('For healthcare providers'),
    description:
      'Connect with CareMate patients, share secure documents, message, and manage appointment requests in the Provider Portal.',
  },
  '/ccn': {
    title: titleWithBrand('CareMate Community Network'),
    description:
      'Join campus, city, and community chapters. Grow CareMate with champions, health contributors, builders, and partners.',
  },
  '/docs': {
    title: titleWithBrand('Guides & documentation'),
    description:
      'Patient, community, and provider guides for CareMate — how to use the app, join CCN, and work with the Provider Portal.',
  },
  '/docs/patient': {
    title: titleWithBrand('Patient guide'),
    description:
      'How to use CareMate: emergency profile, Learn, nearby care, messages, family, and personal health trackers.',
  },
  '/docs/community': {
    title: titleWithBrand('Community guide'),
    description:
      'How the CareMate Community Network works — chapters, roles, and how to join and contribute.',
  },
  '/docs/providers': {
    title: titleWithBrand('Provider guide'),
    description:
      'How healthcare organizations claim orgs, connect with patients, and use CareMate Provider Portal features.',
  },
  '/articles': {
    title: titleWithBrand('Learn health articles'),
    description:
      'Trusted health education on prevention, conditions, symptoms, family health, emergency care, medicines, and more.',
  },
  '/security': {
    title: titleWithBrand('Security'),
    description:
      'How CareMate protects health data: encryption, access controls, sync, and our approach to privacy and trust.',
  },
  '/privacy': {
    title: titleWithBrand('Privacy policy'),
    description: 'CareMate privacy policy — what we collect, how we use data, and your choices.',
  },
  '/terms': {
    title: titleWithBrand('Terms of use'),
    description: 'CareMate terms of use for the app, website, and related services.',
  },
  '/refunds': {
    title: titleWithBrand('Refunds'),
    description: 'CareMate refund and cancellation policy for Premium and Family subscriptions.',
  },
};

export function seoForPath(pathname: string): PageSeo {
  const path = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const staticPage = STATIC_PAGE_SEO[path];
  if (staticPage) {
    return { ...staticPage, path };
  }

  if (
    path.startsWith('/auth/') ||
    path.startsWith('/billing/') ||
    path.startsWith('/emergency/share/')
  ) {
    return {
      path,
      title: titleWithBrand('Open in CareMate'),
      description: 'Continue in the CareMate mobile app.',
      noIndex: true,
    };
  }

  return {
    path: path || '/',
    title: titleWithBrand(PHIN.label),
    description: DEFAULT_DESCRIPTION,
  };
}

export function articleSeo(input: {
  title: string;
  summary: string;
  path: string;
  categoryName: string;
}): PageSeo {
  return {
    path: input.path,
    title: titleWithBrand(input.title),
    description: input.summary,
    ogType: 'article',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: input.title,
      description: input.summary,
      articleSection: input.categoryName,
      author: {
        '@type': 'Organization',
        name: BRAND.name,
      },
      publisher: {
        '@type': 'Organization',
        name: BRAND.name,
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_URL}/caremate-logo.png`,
        },
      },
      mainEntityOfPage: absoluteUrl(input.path),
    },
  };
}

export function categorySeo(input: {
  name: string;
  shortLabel: string;
  path: string;
}): PageSeo {
  return {
    path: input.path,
    title: titleWithBrand(`${input.name} articles`),
    description: `CareMate Learn articles about ${input.name.toLowerCase()} — practical health education for patients and families.`,
  };
}
