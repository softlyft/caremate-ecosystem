import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

function scrollWindowToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

/**
 * Reset window scroll on cross-page navigations.
 * When the location includes a hash, scroll to that element instead
 * (same-page "On this page" links and deep links).
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useLayoutEffect(() => {
    if (hash) {
      const id = decodeURIComponent(hash.replace(/^#/, ''));
      if (id) {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView();
          return;
        }
      }
    }

    scrollWindowToTop();
  }, [pathname, hash]);

  return null;
}
