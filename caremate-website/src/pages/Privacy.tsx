import { Link } from 'react-router-dom';

import styles from './Legal.module.css';

export function PrivacyPage() {
  return (
    <main className={styles.page}>
      <article className={styles.article}>
        <p className={styles.eyebrow}>Legal</p>
        <h1>Privacy policy</h1>
        <p className={styles.lead}>
          This Privacy policy explains how SoftLyft (&quot;SoftLyft,&quot; &quot;we,&quot;
          &quot;us,&quot; or &quot;our&quot;) collects, uses, stores, and shares personal data when
          you use CareMate (mobile apps, websites, and related services). It is written for everyday
          users and as a working baseline for SoftLyft&apos;s legal counsel.
        </p>
        <p>
          CareMate is built for people across <strong>Africa</strong>, with SoftLyft launching first
          in <strong>Nigeria</strong>. Anyone elsewhere may still download and use CareMate where
          the app stores make it available. SoftLyft primarily designs product, support, and nearby
          care experiences around African (especially Nigerian) contexts.
        </p>

        <h2>1. Who controls your data</h2>
        <p>
          For CareMate consumer accounts and the personal health information you enter, SoftLyft is
          the organization that decides why and how that data is processed (the data controller /
          equivalent role under applicable law). Contact:{' '}
          <a href="mailto:hello@getcaremate.com">hello@getcaremate.com</a>. Formal company
          registration details for privacy notices will be confirmed by counsel.
        </p>
        <p>
          SoftLyft aims to align CareMate with Nigerian data-protection expectations (including the
          Nigeria Data Protection Act 2023 and related guidance, as applicable). SoftLyft does{' '}
          <strong>not</strong> claim certification under foreign regimes such as US HIPAA or EU GDPR
          solely because the app is downloadable worldwide. If SoftLyft later offers services that
          require those frameworks, this policy will be updated.
        </p>

        <h2>2. Personal data we may process</h2>
        <p>Depending on how you use CareMate, we may process:</p>
        <ul className={styles.list}>
          <li>
            <strong>Account data</strong> — email, name, password (stored hashed via our auth
            provider), language, country/region preference, and similar profile fields
          </li>
          <li>
            <strong>Health-related data you choose to enter</strong> — for example emergency
            profile details, medications and dose logs, period or pregnancy logs, vitals, checkup or
            immunization records, notes, and related mini-app content
          </li>
          <li>
            <strong>Family and messaging data</strong> — household links, invitations, and messages
            you send or receive in CareMate features
          </li>
          <li>
            <strong>Provider connection data</strong> — connection requests and consent choices you
            make with clinics or organizations using CareMate provider tools
          </li>
          <li>
            <strong>Device and usage data</strong> — app version, device type, crash or performance
            diagnostics (when enabled), approximate analytics events, and push notification tokens
          </li>
          <li>
            <strong>Location</strong> — approximate or precise location when you use Nearby care
            features and grant permission
          </li>
          <li>
            <strong>Payment metadata</strong> — subscription status and billing references;
            card/wallet details are handled by payment partners (for example Paystack) or
            by Apple / Google for in-app purchases — SoftLyft does not store full card numbers
          </li>
        </ul>
        <p>
          We do not require you to enter health data to create an account. Guest mode may keep data
          primarily on-device until you sign in.
        </p>

        <h2>3. Why we process data (purposes)</h2>
        <ul className={styles.list}>
          <li>Provide, sync, backup, and improve CareMate features you use</li>
          <li>Authenticate you and keep accounts secure</li>
          <li>Send transactional notices you request (for example family invites, billing, OTPs)</li>
          <li>Deliver optional push notifications when you enable them</li>
          <li>Show nearby providers and relevant regional content where available</li>
          <li>Process subscriptions and prevent fraud or abuse</li>
          <li>Comply with law and enforce our Terms</li>
          <li>Understand product usage in aggregated or de-identified form where feasible</li>
        </ul>
        <p>
          SoftLyft does <strong>not sell</strong> your personal health information. We do not use
          your identifiable health logs to sell third-party advertising.
        </p>

        <h2>4. Legal bases (where required)</h2>
        <p>
          Where a legal basis is required, SoftLyft typically relies on: performing our contract with
          you (providing the app); your consent (for example notifications, precise location, or
          certain optional shares); SoftLyft&apos;s legitimate interests in securing and improving
          the service (balanced against your rights); and legal obligations. Counsel may refine
          these bases for NDPA and other applicable laws.
        </p>

        <h2>5. Where data lives</h2>
        <ul className={styles.list}>
          <li>
            <strong>On your device</strong> — Core CareMate data is stored locally so essential
            features work offline. On iPhone and Android, the local database is encrypted at rest.
            See <Link to="/security">Security</Link>.
          </li>
          <li>
            <strong>In the cloud</strong> — When you are signed in and online, selected data may sync
            to SoftLyft&apos;s backend (and infrastructure partners) for backup, multi-device access,
            family/provider features, and notifications.
          </li>
          <li>
            <strong>Cross-border processing</strong> — SoftLyft may use reputable cloud and service
            providers that store or process data outside Nigeria. SoftLyft intends to use appropriate
            contractual and security safeguards for such transfers under applicable Nigerian law.
            Exact transfer mechanisms will be confirmed with counsel.
          </li>
        </ul>

        <h2>6. Sharing</h2>
        <p>We may share personal data only as needed to operate CareMate:</p>
        <ul className={styles.list}>
          <li>
            <strong>Infrastructure processors</strong> — hosting, databases, email delivery, push
            notification services, crash/analytics providers (when enabled), and similar vendors
            under contracts that limit use to providing services to SoftLyft
          </li>
          <li>
            <strong>Payment partners</strong> — Paystack, Apple, or Google as applicable
          </li>
          <li>
            <strong>People you choose</strong> — family members you invite, providers you connect
            with, or emergency share recipients using CareMate share flows
          </li>
          <li>
            <strong>Legal and safety</strong> — when required by law, court order, or to protect
            SoftLyft, users, or the public from serious harm or fraud
          </li>
        </ul>
        <p>
          SoftLyft does not operate CareMate as an open patient chart for clinics. Provider messaging
          or connection features only apply when you participate in those flows.
        </p>

        <h2>7. Retention</h2>
        <p>
          We keep account and synced data while your account is active and as needed to provide the
          service. After account deletion, SoftLyft deletes or anonymizes cloud personal data
          associated with your account within a reasonable period, except where SoftLyft must retain
          limited records for legal, security, or accounting reasons (for example billing history).
          Local data on the device that performs deletion is wiped as described in-app. Backups may
          take additional time to fully expire.
        </p>

        <h2>8. Your choices and rights</h2>
        <ul className={styles.list}>
          <li>Update profile and notification preferences in the app</li>
          <li>Revoke OS permissions (location, notifications) in device settings</li>
          <li>Sign out; delete your account from Settings for permanent cloud removal</li>
          <li>
            Request access, correction, or deletion of personal data SoftLyft holds about you by
            emailing <a href="mailto:hello@getcaremate.com">hello@getcaremate.com</a>
          </li>
        </ul>
        <p>
          SoftLyft will respond to privacy requests in line with applicable law. Additional rights
          may apply under Nigerian data-protection law or the law of your country of residence.
        </p>

        <h2>9. Children</h2>
        <p>
          CareMate is not directed at young children as primary account holders. Family features may
          allow adults to manage information about children in their household. If you believe we
          have collected a child&apos;s data inappropriately, contact us and we will take appropriate
          steps.
        </p>

        <h2>10. Security</h2>
        <p>
          SoftLyft uses technical and organizational measures appropriate to the sensitivity of
          health-related data, including encryption in transit, encrypted local storage on supported
          mobile platforms, access controls, and account-isolation practices. No method of
          transmission or storage is perfectly secure. Details are summarized on our{' '}
          <Link to="/security">Security</Link> page.
        </p>

        <h2>11. International users</h2>
        <p>
          If you use CareMate from outside Nigeria, you understand that SoftLyft operates primarily
          from Nigeria / for African markets, and that your information may be processed in Nigeria
          and in other countries where our providers operate. SoftLyft does not market CareMate as a
          certified HIPAA, GDPR, or medical-device product for foreign healthcare systems. Educational
          content and trackers remain consumer tools under our{' '}
          <Link to="/terms">Terms of service</Link>.
        </p>

        <h2>12. Changes</h2>
        <p>
          We may update this policy. The &quot;Last updated&quot; date will change. Material changes
          may be highlighted in-app or by email where appropriate.
        </p>

        <h2>13. Contact</h2>
        <p>
          Privacy questions:{' '}
          <a href="mailto:hello@getcaremate.com">hello@getcaremate.com</a>
        </p>
        <p>
          Related: <Link to="/terms">Terms</Link>
          {' · '}
          <Link to="/security">Security</Link>
          {' · '}
          <Link to="/refunds">Refunds</Link>
        </p>

        <p className={styles.meta}>
          Last updated: August 25, 2026 · Draft for counsel review — SoftLyft intends this policy as
          a working baseline before formal legal finalization (including NDPA registration /
          notices if required).
        </p>
        <p className={styles.back}>
          <Link to="/">← Back to CareMate</Link>
        </p>
      </article>
    </main>
  );
}
