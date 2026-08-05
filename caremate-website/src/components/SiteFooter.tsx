import { Link } from 'react-router-dom';

import { BRAND } from '@/lib/brand';
import styles from './SiteFooter.module.css';

const FOOTER_COLUMNS = [
  {
    title: 'Explore',
    links: [
      { to: '/docs', label: 'Docs' },
      { to: '/articles', label: 'Articles' },
      { to: '/pricing', label: 'Pricing' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { to: '/ccn', label: 'Community' },
      { to: '/providers', label: 'For providers' },
      { to: '/docs/patient', label: 'Patient guide' },
      { to: '/docs/providers', label: 'Provider guide' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { to: '/privacy', label: 'Privacy' },
      { to: '/terms', label: 'Terms' },
    ],
  },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandBlock}>
          <img src="/caremate-splash-icon.png" alt="" width={40} height={40} className={styles.icon} />
          <div>
            <p className={styles.name}>{BRAND.name}</p>
            <p className={styles.byline}>Built by SoftLyft</p>
          </div>
        </div>

        <nav className={styles.columns} aria-label="Footer">
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title} className={styles.column}>
              <p className={styles.columnTitle}>{column.title}</p>
              <ul className={styles.links}>
                {column.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <p className={styles.copy}>© {year} SoftLyft. All rights reserved.</p>
      </div>
    </footer>
  );
}
