import { useEffect } from 'react';

import { absoluteUrl, DEFAULT_OG_IMAGE, type PageSeo } from '@/lib/seo';

const MANAGED_JSON_LD = 'data-caremate-seo';

function upsertNamedMeta(name: string, content: string) {
  let el = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertPropertyMeta(property: string, content: string) {
  let el = document.head.querySelector(
    `meta[property="${property}"]`,
  ) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

function upsertJsonLd(payload: Record<string, unknown> | Record<string, unknown>[]) {
  // Prefer replacing the static homepage JSON-LD so we do not emit duplicates.
  let el =
    (document.head.querySelector(
      `script[type="application/ld+json"][${MANAGED_JSON_LD}]`,
    ) as HTMLScriptElement | null) ??
    (document.head.querySelector('script[type="application/ld+json"]') as HTMLScriptElement | null);

  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.setAttribute(MANAGED_JSON_LD, 'true');
  el.textContent = JSON.stringify(payload);
}

function clearJsonLd() {
  document.head
    .querySelectorAll(`script[type="application/ld+json"][${MANAGED_JSON_LD}]`)
    .forEach((node) => node.remove());
}

/** Updates document title + meta/OG/Twitter/canonical/JSON-LD for the active route. */
export function DocumentMeta({ seo }: { seo: PageSeo }) {
  const jsonLdKey = seo.jsonLd ? JSON.stringify(seo.jsonLd) : '';

  useEffect(() => {
    const url = absoluteUrl(seo.path);
    const image = seo.image ?? DEFAULT_OG_IMAGE;
    const ogType = seo.ogType ?? 'website';

    document.title = seo.title;

    upsertNamedMeta('description', seo.description);
    upsertNamedMeta('robots', seo.noIndex ? 'noindex, nofollow' : 'index, follow');

    upsertCanonical(url);

    upsertPropertyMeta('og:type', ogType);
    upsertPropertyMeta('og:site_name', 'CareMate');
    upsertPropertyMeta('og:title', seo.title);
    upsertPropertyMeta('og:description', seo.description);
    upsertPropertyMeta('og:url', url);
    upsertPropertyMeta('og:image', image);

    upsertNamedMeta('twitter:card', 'summary_large_image');
    upsertNamedMeta('twitter:title', seo.title);
    upsertNamedMeta('twitter:description', seo.description);
    upsertNamedMeta('twitter:image', image);

    if (seo.jsonLd) {
      upsertJsonLd(seo.jsonLd);
    } else {
      clearJsonLd();
    }
  }, [
    seo.title,
    seo.description,
    seo.path,
    seo.noIndex,
    seo.ogType,
    seo.image,
    seo.jsonLd,
    jsonLdKey,
  ]);

  return null;
}
