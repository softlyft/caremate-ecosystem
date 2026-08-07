#!/usr/bin/env node
/**
 * Writes public/robots.txt, public/llms.txt, and public/sitemap.xml
 * (includes Learn article URLs from caremate-admin-portal/data/learn.json).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const publicDir = join(root, 'public');
const siteUrl = (
  process.env.VITE_SITE_URL?.trim() ||
  process.env.SITE_URL?.trim() ||
  'https://www.getcaremate.com'
).replace(/\/$/, '');

const LEGACY_CATEGORY_ID_MAP = {
  heart: 'conditions',
  child: 'family',
  pregnancy: 'family',
  mental: 'mental',
  medication: 'medicines',
  nutrition: 'nutrition',
  fitness: 'nutrition',
  infectious: 'conditions',
};

const CATEGORY_IDS = new Set([
  'prevention',
  'conditions',
  'symptoms',
  'family',
  'emergency',
  'care_system',
  'medicines',
  'mental',
  'tests',
  'nutrition',
]);

function slugify(title) {
  return String(title ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function normalizeCategoryId(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return null;
  const mapped = LEGACY_CATEGORY_ID_MAP[trimmed] ?? trimmed;
  return CATEGORY_IDS.has(mapped) ? mapped : null;
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const staticPaths = [
  '/',
  '/pricing',
  '/providers',
  '/ccn',
  '/docs',
  '/docs/patient',
  '/docs/community',
  '/docs/providers',
  '/articles',
  '/security',
  '/privacy',
  '/terms',
  '/refunds',
];

const learn = JSON.parse(
  readFileSync(join(root, '../caremate-admin-portal/data/learn.json'), 'utf8'),
);

const usedSlugs = new Set();
const articlePaths = [];
const categoryPaths = new Set();

for (const [rawCategoryId, items] of Object.entries(learn)) {
  if (!Array.isArray(items)) continue;
  const categoryId = normalizeCategoryId(rawCategoryId);
  if (!categoryId) continue;
  categoryPaths.add(`/articles/${categoryId}`);

  for (const item of items) {
    let slug = slugify(item.title) || slugify(item.id);
    const base = slug;
    let n = 2;
    while (usedSlugs.has(`${categoryId}/${slug}`)) {
      slug = `${base}-${n}`;
      n += 1;
    }
    usedSlugs.add(`${categoryId}/${slug}`);
    articlePaths.push(`/articles/${categoryId}/${slug}`);
  }
}

const today = new Date().toISOString().slice(0, 10);
const urls = [
  ...staticPaths.map((path) => ({ path, priority: path === '/' ? '1.0' : '0.8' })),
  ...[...categoryPaths].sort().map((path) => ({ path, priority: '0.7' })),
  ...articlePaths.map((path) => ({ path, priority: '0.6' })),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    ({ path, priority }) => `  <url>
    <loc>${xmlEscape(`${siteUrl}${path}`)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`;

const robots = `User-agent: *
Allow: /

# App deep-link / auth landing pages — not for indexing
Disallow: /auth/
Disallow: /billing/
Disallow: /emergency/share/

Sitemap: ${siteUrl}/sitemap.xml
`;

const llms = `# CareMate

> CareMate is a Personal Health Intelligence Network (PHIN): an offline-first mobile health app with an emergency profile, nearby care discovery, Learn articles, and personal trackers (vitals, medication, checkups, period, pregnancy, immunization).

CareMate helps people keep critical health details ready when care is needed, discover nearby providers, and organize everyday health tracking. Selected data can sync to the cloud for signed-in accounts. CareMate does not sell personal health information.

## Product

- Homepage: ${siteUrl}/
- Pricing: ${siteUrl}/pricing
- Patient guide: ${siteUrl}/docs/patient
- Security: ${siteUrl}/security
- Privacy: ${siteUrl}/privacy
- Terms: ${siteUrl}/terms
- Refunds: ${siteUrl}/refunds

## Solutions

- Providers (healthcare organizations): ${siteUrl}/providers
- Provider guide: ${siteUrl}/docs/providers
- CareMate Community Network (CCN): ${siteUrl}/ccn
- Community guide: ${siteUrl}/docs/community
- Docs index: ${siteUrl}/docs

## Learn

Trusted health education articles for patients and families:

- Articles index: ${siteUrl}/articles
- Categories cover prevention, conditions, symptoms, family health, emergency, care navigation, medicines, mental health, tests, and nutrition.

## Apps

- iOS: https://apps.apple.com/app/caremate
- Android: https://play.google.com/store/apps/details?id=com.softlyft.caremate

## Contact

- Support: hello@getcaremate.com
- Website: ${siteUrl}/
`;

writeFileSync(join(publicDir, 'robots.txt'), robots, 'utf8');
writeFileSync(join(publicDir, 'llms.txt'), llms, 'utf8');
writeFileSync(join(publicDir, 'sitemap.xml'), sitemap, 'utf8');

console.log(
  `SEO assets → ${publicDir} (${urls.length} sitemap URLs, site=${siteUrl})`,
);
