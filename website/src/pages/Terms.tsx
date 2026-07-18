import { Link } from 'react-router-dom';

import styles from './Legal.module.css';

export function TermsPage() {
  return (
    <main className={styles.page}>
      <article className={styles.article}>
        <p className={styles.eyebrow}>Legal</p>
        <h1>Terms of service</h1>
        <p className={styles.lead}>
          These terms govern your use of CareMate mobile apps and related SoftLyft services. By
          using CareMate you agree to these terms.
        </p>

        <h2>Not medical advice</h2>
        <p>
          CareMate provides organizational tools and general health information. It does not
          diagnose, treat, or replace professional medical advice, emergency services, or clinical
          care. Always seek qualified clinicians for medical decisions.
        </p>

        <h2>Accounts</h2>
        <p>
          You are responsible for the accuracy of information you enter and for keeping your sign-in
          credentials secure. You may explore some features as a guest; Premium and synced tools
          require an account.
        </p>

        <h2>Acceptable use</h2>
        <p>
          Do not misuse CareMate, attempt unauthorized access, disrupt the service, or use it in
          ways that violate applicable law. SoftLyft may suspend accounts that abuse the platform.
        </p>

        <h2>Subscriptions</h2>
        <p>
          Paid CareMate plans are offered according to in-app pricing and store or payment-provider
          terms. Fees, renewals, and cancellations follow the checkout flow and provider policies
          presented at purchase.
        </p>

        <h2>Availability</h2>
        <p>
          We aim for reliable service but do not guarantee uninterrupted availability. Offline
          features depend on data stored on your device.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms: <a href="mailto:hi@softlyft.com">hi@softlyft.com</a>
        </p>

        <p className={styles.meta}>Last updated: July 18, 2026</p>
        <p className={styles.back}>
          <Link to="/">← Back to CareMate</Link>
        </p>
      </article>
    </main>
  );
}
