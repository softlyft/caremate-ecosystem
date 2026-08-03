import { Link } from 'react-router-dom';

import { BRAND } from '@/lib/brand';
import styles from './Docs.module.css';

const DOCS = [
  {
    id: 'patient',
    href: '/docs/patient',
    audience: 'Patients & families',
    title: 'Patient guide',
    description:
      'How to use CareMate day to day — emergency profile, Learn, Nearby care, Messages, family, and health mini-apps.',
  },
  {
    id: 'community',
    href: '/docs/community',
    audience: 'Community members',
    title: 'Community guide',
    description:
      'Join the CareMate Community Network, pick a chapter, and contribute as a champion, health contributor, builder, or partner.',
  },
  {
    id: 'providers',
    href: '/docs/providers',
    audience: 'Clinics & organizations',
    title: 'Provider guide',
    description:
      'Claim your organization, connect with patients, message securely, and manage staff in the Provider Portal.',
  },
] as const;

export function DocsIndexPage() {
  return (
    <main className={styles.page}>
      <article className={`${styles.article} ${styles.wide}`}>
        <p className={styles.eyebrow}>Documentation</p>
        <h1>CareMate docs</h1>
        <p className={styles.lead}>
          Pick the guide that matches what you are looking for — whether you use {BRAND.name} as a
          patient, contribute in the community, or run a care organization.
        </p>

        <div className={styles.grid}>
          {DOCS.map((doc) => (
            <Link key={doc.id} to={doc.href} className={styles.card}>
              <p className={styles.cardMeta}>{doc.audience}</p>
              <h2 className={styles.cardTitle}>{doc.title}</h2>
              <p className={styles.cardSummary}>{doc.description}</p>
              <span className={styles.cardCta}>Open guide →</span>
            </Link>
          ))}
        </div>

        <p className={styles.related}>
          Looking for health reading instead?{' '}
          <Link to="/articles">Browse evergreen articles</Link>.
        </p>
      </article>
    </main>
  );
}
