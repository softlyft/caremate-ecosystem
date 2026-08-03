import learnRaw from '@evergreen-learn';

export type HealthCategoryId =
  | 'prevention'
  | 'conditions'
  | 'symptoms'
  | 'family'
  | 'emergency'
  | 'care_system'
  | 'medicines'
  | 'mental'
  | 'tests'
  | 'nutrition';

export type LearnArticleSeed = {
  id: string;
  title: string;
  summary: string;
  content: string;
};

export type WebsiteArticle = LearnArticleSeed & {
  categoryId: HealthCategoryId;
  categoryName: string;
  categoryShortLabel: string;
  slug: string;
  href: string;
};

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
] as const satisfies ReadonlyArray<{
  id: HealthCategoryId;
  shortLabel: string;
  name: string;
}>;

const CATEGORY_BY_ID = new Map(HEALTH_CATEGORIES.map((category) => [category.id, category]));

const LEGACY_CATEGORY_ID_MAP: Record<string, HealthCategoryId> = {
  heart: 'conditions',
  child: 'family',
  pregnancy: 'family',
  mental: 'mental',
  medication: 'medicines',
  nutrition: 'nutrition',
  fitness: 'nutrition',
  infectious: 'conditions',
};

export function slugify(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function isHealthCategoryId(value: string): value is HealthCategoryId {
  return CATEGORY_BY_ID.has(value as HealthCategoryId);
}

export function normalizeCategoryId(raw: string): HealthCategoryId | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const mapped = LEGACY_CATEGORY_ID_MAP[trimmed] ?? trimmed;
  return isHealthCategoryId(mapped) ? mapped : null;
}

export function getCategoryMeta(categoryId: string) {
  const normalized = normalizeCategoryId(categoryId);
  return normalized ? CATEGORY_BY_ID.get(normalized) : undefined;
}

function buildCatalog(raw: Record<string, LearnArticleSeed[]>): WebsiteArticle[] {
  const articles: WebsiteArticle[] = [];
  const usedSlugs = new Set<string>();

  for (const [rawCategoryId, items] of Object.entries(raw)) {
    if (!Array.isArray(items)) continue;
    const categoryId = normalizeCategoryId(rawCategoryId);
    const meta = categoryId ? CATEGORY_BY_ID.get(categoryId) : undefined;
    if (!categoryId || !meta) continue;

    for (const item of items) {
      let slug = slugify(item.title) || slugify(item.id);
      const base = slug;
      let n = 2;
      while (usedSlugs.has(`${categoryId}/${slug}`)) {
        slug = `${base}-${n}`;
        n += 1;
      }
      usedSlugs.add(`${categoryId}/${slug}`);

      articles.push({
        ...item,
        categoryId,
        categoryName: meta.name,
        categoryShortLabel: meta.shortLabel,
        slug,
        href: `/articles/${categoryId}/${slug}`,
      });
    }
  }

  return articles;
}

const catalog = buildCatalog(learnRaw as Record<string, LearnArticleSeed[]>);

export function listArticles(): WebsiteArticle[] {
  return catalog;
}

export function listCategoriesWithArticles() {
  return HEALTH_CATEGORIES.map((category) => ({
    ...category,
    articles: catalog.filter((article) => article.categoryId === category.id),
  })).filter((category) => category.articles.length > 0);
}

export function listArticlesByCategory(categoryId: string): WebsiteArticle[] {
  const normalized = normalizeCategoryId(categoryId);
  if (!normalized) return [];
  return catalog.filter((article) => article.categoryId === normalized);
}

export function getArticleByCategoryAndSlug(
  categoryId: string,
  slug: string,
): WebsiteArticle | undefined {
  const normalized = normalizeCategoryId(categoryId);
  if (!normalized) return undefined;
  const needle = slug.trim().toLowerCase();
  return catalog.find(
    (article) => article.categoryId === normalized && article.slug === needle,
  );
}

export function getArticleById(articleId: string): WebsiteArticle | undefined {
  const id = articleId.trim();
  if (!id) return undefined;
  return catalog.find((article) => article.id === id);
}

export function articlePath(article: Pick<WebsiteArticle, 'categoryId' | 'slug'>): string {
  return `/articles/${article.categoryId}/${article.slug}`;
}

/** Split evergreen body text into paragraphs for rendering. */
export function contentToParagraphs(content: string): string[] {
  return content
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}
