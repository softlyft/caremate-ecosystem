import { useEffect, useId, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

import { BRAND } from '@/lib/brand';
import styles from './SiteHeader.module.css';

type Props = {
  tone?: 'hero' | 'light';
};

const MAIN_LINKS = [
  { to: '/docs', label: 'Docs' },
  { to: '/articles', label: 'Articles' },
  { to: '/ccn', label: 'Community' },
  { to: '/providers', label: 'Providers' },
  { to: '/providers/pricing', label: 'Provider plans' },
  { to: '/payers/pricing', label: 'Payer plans' },
  { to: '/pricing', label: 'App pricing' },
] as const;

export function SiteHeader({ tone = 'hero' }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  return (
    <header
      className={`${styles.header} ${tone === 'light' ? styles.light : styles.hero} ${
        menuOpen ? styles.menuOpen : ''
      }`}
    >
      <div className={styles.inner}>
        <Link to="/" className={styles.brand} aria-label={`${BRAND.name} home`}>
          <img
            src="/caremate-splash-icon.png"
            alt=""
            width={40}
            height={40}
            className={styles.icon}
          />
          <span className={styles.wordmark}>{BRAND.name}</span>
        </Link>

        <button
          type="button"
          className={styles.menuButton}
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className={styles.menuIcon} aria-hidden="true" />
        </button>

        <nav id={menuId} className={styles.nav} aria-label="Primary">
          {MAIN_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => (isActive ? styles.active : undefined)}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {menuOpen ? (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
    </header>
  );
}
