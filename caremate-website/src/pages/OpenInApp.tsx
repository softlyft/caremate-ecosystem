import { APP_STORE_URLS, BRAND, SITE_URL } from '@/lib/brand';

import styles from './OpenInApp.module.css';

type OpenInAppPageProps = {
  title: string;
  description: string;
  /** Path after scheme, e.g. `auth/reset-password` or `emergency/share/abc…` */
  appPath: string;
};

/**
 * Fallback when Universal / App Links open in the browser (app not installed
 * or verification not yet live). Tries the custom scheme, then store links.
 */
export function OpenInAppPage({ title, description, appPath }: OpenInAppPageProps) {
  const customSchemeUrl = `caremate://${appPath.replace(/^\//, '')}`;
  const httpsUrl = `${SITE_URL.replace(/\/$/, '')}/${appPath.replace(/^\//, '')}`;

  return (
    <main className={styles.page}>
      <p className={styles.brand}>{BRAND.name}</p>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.body}>{description}</p>
      <div className={styles.actions}>
        <a className={styles.primary} href={customSchemeUrl}>
          Open in {BRAND.name}
        </a>
        <a className={styles.secondary} href={APP_STORE_URLS.ios}>
          App Store
        </a>
        <a className={styles.secondary} href={APP_STORE_URLS.android}>
          Google Play
        </a>
      </div>
      <p className={styles.hint}>
        Link: <code>{httpsUrl}</code>
      </p>
    </main>
  );
}
