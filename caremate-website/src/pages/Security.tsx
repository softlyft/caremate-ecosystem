import { Link } from 'react-router-dom';

import styles from './Legal.module.css';

export function SecurityPage() {
  return (
    <main className={styles.page}>
      <article className={styles.article}>
        <p className={styles.eyebrow}>Trust &amp; security</p>
        <h1>How CareMate protects your data</h1>
        <p className={styles.lead}>
          CareMate is a personal health companion for people across Africa — launching first in
          Nigeria, and available worldwide where the app stores list it. SoftLyft built CareMate so
          your information stays under your control: on your phone first, encrypted where it
          matters, and shared only when you choose. This page explains our approach in plain
          language. For legal details, see our <Link to="/privacy">Privacy policy</Link> and{' '}
          <Link to="/terms">Terms of service</Link>.
        </p>

        <h2>Your phone comes first</h2>
        <p>
          Core CareMate data lives on your device so emergency details, mini-apps, and learning
          content work even when you are offline. On iPhone and Android, your local CareMate database
          is <strong>encrypted at rest</strong> — if someone copies the app data off the phone
          without your device unlock, they cannot read your health records from that copy alone.
        </p>
        <p>
          Sign-in credentials are stored in the device&apos;s secure storage (Keychain / Keystore),
          not as plain text in the app. Your OS passcode or biometrics still protect the device
          itself.
        </p>

        <h2>When data moves over the internet</h2>
        <p>
          Any sync, sign-in, checkout, or message between CareMate and our servers uses{' '}
          <strong>encrypted connections</strong> (HTTPS/TLS). We do not send your account password
          in links or expose long-lived session secrets in payment URLs.
        </p>

        <h2>Your cloud backup</h2>
        <p>
          When you are signed in, selected data may sync to our cloud so you can recover it on a new
          phone. Access is tied to <strong>your account</strong> — other CareMate users cannot browse
          your profile, and provider or family access only happens through flows you approve (such as
          a connection request or family invitation).
        </p>
        <p>
          For sensitive synced health fields, we use additional protection so clinical content is
          not stored as readable plain text in the database when those protections are enabled. In
          practice, that means your signed-in app can unlock your data — SoftLyft operators and
          infrastructure staff are not meant to read your health content from the database itself.
        </p>

        <h2>You choose who sees what</h2>
        <ul className={styles.list}>
          <li>
            <strong>Providers</strong> — A clinic or pharmacy only interacts with you after a
            connection you or they initiate and you accept. CareMate is not an open directory of
            patient charts.
          </li>
          <li>
            <strong>Family</strong> — Household and spouse features are invitation-based. Lookups
            for other users mask personal details and are rate-limited.
          </li>
          <li>
            <strong>Emergency sharing</strong> — Your Patient ID QR opens a controlled share flow; it
            does not print your full emergency profile in the barcode for anyone nearby to scan
            silently.
          </li>
          <li>
            <strong>No selling health data</strong> — We do not sell personal health information. See{' '}
            <Link to="/privacy">Privacy</Link> for how we use data to run the service.
          </li>
        </ul>

        <h2>Payments</h2>
        <p>
          Premium checkout opens in a secure web flow or through Apple / Google billing. Card and
          wallet details are handled by our payment partners (for example Paystack) or the
          app stores. CareMate does not store your full card number on our servers.
        </p>

        <h2>Shared or family devices</h2>
        <p>
          If someone else signs in to CareMate on a phone that already had an account, the app asks
          for confirmation before replacing local data. Signing out clears push registration for
          that device. Deleting your account removes your cloud profile and wipes local CareMate
          data on the device that performs the deletion.
        </p>

        <h2>Your controls</h2>
        <ul className={styles.list}>
          <li>Update profile and preferences in the app</li>
          <li>Sign out on a device you no longer use</li>
          <li>Delete your account from Settings for permanent cloud removal</li>
          <li>
            Contact us at{' '}
            <a href="mailto:hello@getcaremate.com">hello@getcaremate.com</a> for security or privacy
            questions
          </li>
        </ul>

        <h2>What this page is not</h2>
        <p>
          This is a customer-facing summary, not a technical specification, audit report, or legal
          certification (including HIPAA, GDPR, or NDPA &quot;compliant&quot; badges). CareMate
          provides organizational tools and general health information — it does not replace
          professional medical care or emergency services. No system is perfectly immune to risk; we
          continue to improve controls as the product grows across Africa and for users who join from
          elsewhere.
        </p>

        <h2>Related</h2>
        <p>
          <Link to="/privacy">Privacy policy</Link>
          {' · '}
          <Link to="/terms">Terms of service</Link>
        </p>

        <p className={styles.meta}>Last updated: August 25, 2026</p>
        <p className={styles.back}>
          <Link to="/">← Back to CareMate</Link>
        </p>
      </article>
    </main>
  );
}
