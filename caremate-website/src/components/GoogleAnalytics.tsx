import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { initGoogleAnalytics, trackPageView } from '@/lib/analytics';

export function GoogleAnalytics() {
  const location = useLocation();

  useEffect(() => {
    initGoogleAnalytics();
    // DocumentMeta updates the title in an effect; wait so the page view uses the new title.
    const timer = window.setTimeout(() => {
      trackPageView(`${location.pathname}${location.search}`);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.search]);

  return null;
}
