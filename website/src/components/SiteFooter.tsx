import { Link } from 'react-router-dom';

import { BRAND } from '@/lib/brand';
import styles from './SiteFooter.module.css';

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
        <nav className={styles.links} aria-label="Footer">
          <Link to="/guide">Patient guide</Link>
          <Link to="/privacy">Privacy policy</Link>
          <Link to="/terms">Terms of service</Link>
        </nav>
        <p className={styles.copy}>© {year} SoftLyft. All rights reserved.</p>
      </div>
    </footer>
  );
}
