import { Link } from 'react-router-dom';

import styles from './Legal.module.css';

export function DeleteAccountPage() {
  return (
    <main className={styles.page}>
      <article className={styles.article}>
        <p className={styles.eyebrow}>Account deletion</p>
        <h1>Delete your CareMate account</h1>
        <p className={styles.lead}>
          If you created a CareMate account, you can request that SoftLyft delete it. You do not
          need to keep the app installed to make this request.
        </p>

        <h2>Delete in the CareMate app</h2>
        <ol className={styles.list}>
          <li>Open CareMate and sign in.</li>
          <li>
            Go to <strong>Me → Settings</strong>.
          </li>
          <li>
            Tap <strong>Delete account</strong> and confirm.
          </li>
        </ol>
        <p>
          The app erases your personal CareMate data on that device and asks our servers to delete
          or deidentify your cloud profile.
        </p>

        <h2>Request deletion by email</h2>
        <p>
          If you uninstalled CareMate or cannot sign in, email{' '}
          <a href="mailto:hello@getcaremate.com?subject=CareMate%20account%20deletion%20request">
            hello@getcaremate.com
          </a>{' '}
          with the subject <strong>CareMate account deletion request</strong>.
        </p>
        <p>Include:</p>
        <ul className={styles.list}>
          <li>The email address or phone number on the account</li>
          <li>Your full name, if you remember it</li>
          <li>A statement that you want the account deleted</li>
        </ul>
        <p>
          SoftLyft will verify the request and delete or anonymize personal cloud data associated
          with the account, usually within 30 days. We may ask a short follow-up question to confirm
          you control the account.
        </p>

        <h2>What we delete</h2>
        <ul className={styles.list}>
          <li>Your profile details (name, contact, date of birth, and similar identity fields)</li>
          <li>Emergency profile and personal health trackers synced to your account</li>
          <li>Family household links you own, bookmarks, and device notification registrations</li>
          <li>Active CareMate subscriptions, cancelled when the payment provider allows it</li>
        </ul>

        <h2>What we may keep</h2>
        <p>
          Limited records can remain where the law, security, or accounting requires it — for
          example billing history. Messages or care history with a clinic or insurer may stay
          labeled as a deleted user so those organizations keep a complete record. Local data on a
          phone you no longer have is not reachable from our servers.
        </p>

        <p>
          Related: <Link to="/privacy">Privacy policy</Link>
          {' · '}
          <Link to="/terms">Terms of service</Link>
        </p>

        <p className={styles.meta}>Last updated: September 27, 2026</p>
        <p className={styles.back}>
          <Link to="/">← Back to CareMate</Link>
        </p>
      </article>
    </main>
  );
}
