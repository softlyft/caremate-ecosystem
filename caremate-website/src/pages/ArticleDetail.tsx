import { Link, Navigate, useParams } from 'react-router-dom';

import { DocumentMeta } from '@/components/DocumentMeta';
import { ArticleBody } from '@/components/ArticleBody';
import { getArticleByCategoryAndSlug } from '@/lib/articles';
import { articleSeo } from '@/lib/seo';
import styles from './Articles.module.css';

export function ArticleDetailPage() {
  const { category = '', slug = '' } = useParams();
  const article = getArticleByCategoryAndSlug(category, slug);

  if (!article) {
    return <Navigate to="/articles" replace />;
  }

  return (
    <main className={styles.page}>
      <DocumentMeta
        seo={articleSeo({
          title: article.title,
          summary: article.summary,
          path: article.href,
          categoryName: article.categoryName,
        })}
      />
      <article className={styles.article}>
        <nav className={styles.crumbs} aria-label="Breadcrumb">
          <Link to="/articles">Articles</Link>
          <span aria-hidden="true">/</span>
          <Link to={`/articles/${article.categoryId}`}>{article.categoryShortLabel}</Link>
          <span aria-hidden="true">/</span>
          <span>{article.title}</span>
        </nav>
        <p className={styles.eyebrow}>{article.categoryName}</p>
        <h1>{article.title}</h1>
        <p className={styles.lead}>{article.summary}</p>

        <ArticleBody content={article.content} />

        <Link to={`/articles/${article.categoryId}`} className={styles.back}>
          ← More in {article.categoryShortLabel}
        </Link>
      </article>
    </main>
  );
}
