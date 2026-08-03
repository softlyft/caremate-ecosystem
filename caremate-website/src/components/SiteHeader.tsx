import { Link, NavLink } from 'react-router-dom';

import { BRAND } from '@/lib/brand';
import styles from './SiteHeader.module.css';

type Props = {
  tone?: 'hero' | 'light';
};

export function SiteHeader({ tone = 'hero' }: Props) {
  return (
    <header className={`${styles.header} ${tone === 'light' ? styles.light : styles.hero}`}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand} aria-label={`${BRAND.name} home`}>
          <img
            src="/caremate-logo-header.png"
            alt=""
            width={168}
            height={40}
            className={styles.logo}
          />
        </Link>
        <nav className={styles.nav} aria-label="Primary">
          {tone === 'hero' ? (
            <>
              <a href="#core">Core</a>
              <a href="#tools">Mini-apps</a>
              <a href="#providers">Providers</a>
            </>
          ) : null}
          <NavLink to="/docs" className={({ isActive }) => (isActive ? styles.active : undefined)}>
            Docs
          </NavLink>
          <NavLink
            to="/articles"
            className={({ isActive }) => (isActive ? styles.active : undefined)}
          >
            Articles
          </NavLink>
          <NavLink to="/ccn" className={({ isActive }) => (isActive ? styles.active : undefined)}>
            Community
          </NavLink>
          <NavLink
            to="/providers"
            className={({ isActive }) => (isActive ? styles.active : undefined)}
          >
            For providers
          </NavLink>
          <NavLink to="/privacy" className={({ isActive }) => (isActive ? styles.active : undefined)}>
            Privacy
          </NavLink>
          <NavLink to="/terms" className={({ isActive }) => (isActive ? styles.active : undefined)}>
            Terms
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
