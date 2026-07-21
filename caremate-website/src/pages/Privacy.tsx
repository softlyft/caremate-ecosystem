import { Link } from 'react-router-dom';

import styles from './Legal.module.css';

export function PrivacyPage() {
  return (
    <main className={styles.page}>
      <article className={styles.article}>
        <p className={styles.eyebrow}>Legal</p>
        <h1>Privacy policy</h1>
        <p className={styles.lead}>
          CareMate is built by SoftLyft to help you manage health information with a strong
          offline-first design. This page summarizes how we handle data in the CareMate apps and
          related services.
        </p>

        <h2>What we collect</h2>
        <p>
          Depending on how you use CareMate, we may process account details (such as email and
          name), health-related information you choose to enter (for example emergency profile
          fields and mini-app logs), device and usage diagnostics, and approximate location when you
          search for nearby care.
        </p>

        <h2>How we use information</h2>
        <p>
          We use your information to provide and improve CareMate features, sync data across your
          signed-in devices when you opt in, send account and family-related notices you request,
          and keep the service secure and reliable.
        </p>

        <h2>Storage and offline use</h2>
        <p>
          Core CareMate data is stored on your device so essential features can work without an
          internet connection. When you are signed in and online, selected data may sync to our
          cloud backend (Supabase) for backup and multi-device access.
        </p>

        <h2>Sharing</h2>
        <p>
          We do not sell your personal health information. We may share data with infrastructure
          providers that process it on our behalf (for example hosting, analytics, crash reporting,
          and payment processors for Premium), subject to appropriate safeguards.
        </p>

        <h2>Your choices</h2>
        <p>
          You can update preferences in the app, sign out at any time, and request permanent account
          deletion from Settings. Deleting your account removes your cloud account and associated
          synced data, with local wipe on the device that performs the deletion.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about privacy: <a href="mailto:hi@softlyft.com">hi@softlyft.com</a>
        </p>

        <p className={styles.meta}>Last updated: July 18, 2026</p>
        <p className={styles.back}>
          <Link to="/">← Back to CareMate</Link>
        </p>
      </article>
    </main>
  );
}
