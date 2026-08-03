import { Link, Navigate, useParams } from 'react-router-dom';

import {
  getArticleById,
  getCategoryMeta,
  listArticlesByCategory,
  normalizeCategoryId,
} from '@/lib/articles';
import styles from './Articles.module.css';

export function ArticlesCategoryPage() {
  const { category = '' } = useParams();
  const categoryId = normalizeCategoryId(category);
  const meta = categoryId ? getCategoryMeta(categoryId) : undefined;
  const articles = categoryId ? listArticlesByCategory(categoryId) : [];

  // Legacy share links: `/articles/:articleId` → canonical `/articles/:category/:slug`
  if (!categoryId || !meta) {
    const byId = getArticleById(category);
    if (byId) {
      return <Navigate to={byId.href} replace />;
    }
    return <Navigate to="/articles" replace />;
  }

  return (
    <main className={styles.page}>
      <article className={`${styles.article} ${styles.wide}`}>
        <nav className={styles.crumbs} aria-label="Breadcrumb">
          <Link to="/articles">Articles</Link>
          <span aria-hidden="true">/</span>
          <span>{meta.shortLabel}</span>
        </nav>
        <p className={styles.eyebrow}>{meta.shortLabel}</p>
        <h1>{meta.name}</h1>
        <p className={styles.lead}>
          {articles.length} article{articles.length === 1 ? '' : 's'} in this category.
        </p>

        {articles.length === 0 ? (
          <p className={styles.empty}>No articles in this category yet.</p>
        ) : (
          <ul className={styles.list}>
            {articles.map((article) => (
              <li key={article.id}>
                <Link to={article.href}>
                  <h2 className={styles.cardTitle}>{article.title}</h2>
                  <p className={styles.cardSummary}>{article.summary}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Link to="/articles" className={styles.back}>
          ← All categories
        </Link>
      </article>
    </main>
  );
}
