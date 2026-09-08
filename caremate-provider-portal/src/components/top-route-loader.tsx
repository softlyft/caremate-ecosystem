'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

function shouldStartFromAnchor(anchor: HTMLAnchorElement) {
  if (anchor.target && anchor.target !== '_self') return false;
  if (anchor.hasAttribute('download')) return false;

  const href = anchor.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return false;
  }

  let url: URL;
  try {
    url = new URL(anchor.href, window.location.href);
  } catch {
    return false;
  }

  if (url.origin !== window.location.origin) return false;
  return url.pathname !== window.location.pathname || url.search !== window.location.search;
}

function TopRouteLoaderInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const startedRef = useRef(false);
  const routeKeyRef = useRef(routeKey);

  useEffect(() => {
    if (!startedRef.current) {
      routeKeyRef.current = routeKey;
      return;
    }
    if (routeKey === routeKeyRef.current) return;

    routeKeyRef.current = routeKey;
    startedRef.current = false;
    setProgress(100);
    const hide = window.setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 240);
    return () => window.clearTimeout(hide);
  }, [routeKey]);

  useEffect(() => {
    function finish() {
      startedRef.current = false;
      setProgress(100);
      window.setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 240);
    }

    function start() {
      startedRef.current = true;
      setVisible(true);
      setProgress((current) => (current > 0 && current < 100 ? current : 10));
      window.setTimeout(() => {
        if (startedRef.current) finish();
      }, 8000);
    }

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || isModifiedClick(event)) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a');
      if (!(anchor instanceof HTMLAnchorElement) || !shouldStartFromAnchor(anchor)) return;
      start();
    }

    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', start);

    const stuck = window.setInterval(() => {
      if (!startedRef.current) return;
      setProgress((current) => (current >= 92 ? current : Math.min(92, current + 1)));
    }, 400);

    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', start);
      window.clearInterval(stuck);
    };
  }, []);

  useEffect(() => {
    if (!visible || progress >= 90) return;
    const trickle = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 90) return current;
        const step = current < 35 ? 10 : current < 70 ? 4 : 1.5;
        return Math.min(90, current + step);
      });
    }, 160);
    return () => window.clearInterval(trickle);
  }, [visible, progress]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-[3px] overflow-hidden"
      role="progressbar"
      aria-label="Loading page"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
    >
      <div
        className="h-full bg-primary shadow-[0_0_10px_rgba(13,148,136,0.75)] transition-[width] duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

/** Left-to-right line at the top of the viewport while a page navigation is in flight. */
export function TopRouteLoader() {
  return (
    <Suspense fallback={null}>
      <TopRouteLoaderInner />
    </Suspense>
  );
}
