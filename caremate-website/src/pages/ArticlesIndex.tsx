import { Link } from 'react-router-dom';

import { listCategoriesWithArticles } from '@/lib/articles';
import styles from './Articles.module.css';

export function ArticlesIndexPage() {
  const categories = listCategoriesWithArticles();

  return (
    <main className={styles.page}>
      <article className={`${styles.article} ${styles.wide}`}>
        <p className={styles.eyebrow}>Learn</p>
        <h1>Health articles</h1>
        <p className={styles.lead}>
          Clear, practical health guides from CareMate — the same evergreen library you can browse
          in the app.
        </p>

        <div className={styles.categoryGrid}>
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/articles/${category.id}`}
              className={styles.card}
            >
              <p className={styles.cardMeta}>{category.shortLabel}</p>
              <h2 className={styles.cardTitle}>{category.name}</h2>
              <p className={styles.cardSummary}>
                {category.articles.length} article{category.articles.length === 1 ? '' : 's'}
              </p>
            </Link>
          ))}
        </div>
      </article>
    </main>
  );
}
