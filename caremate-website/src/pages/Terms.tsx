import { Link } from 'react-router-dom';

import styles from './Legal.module.css';

export function TermsPage() {
  return (
    <main className={styles.page}>
      <article className={styles.article}>
        <p className={styles.eyebrow}>Legal</p>
        <h1>Terms of service</h1>
        <p className={styles.lead}>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of CareMate —
          including the mobile apps, websites, and related services operated by SoftLyft
          (&quot;SoftLyft,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By creating an account, continuing as a guest
          where allowed, or otherwise using CareMate, you agree to these Terms. If you do not
          agree, do not use CareMate.
        </p>
        <p>
          SoftLyft is building CareMate for people across <strong>Africa</strong>, with an initial
          launch and primary operations focus in <strong>Nigeria</strong>. The apps may be
          downloaded and used in other countries where Apple or Google make them available. Global
          availability does not mean SoftLyft maintains a local establishment, licensed clinical
          service, or healthcare product registration in every country.
        </p>

        <h2>1. Who we are</h2>
        <p>
          CareMate is provided by SoftLyft. For notices under these Terms, contact{' '}
          <a href="mailto:hello@getcaremate.com">hello@getcaremate.com</a>. SoftLyft&apos;s
          registered details, address, and company number for formal legal notices will be
          confirmed by SoftLyft&apos;s counsel and may be updated on this page.
        </p>

        <h2>2. What CareMate is (and is not)</h2>
        <p>
          CareMate is a <strong>personal health companion</strong>: organizational tools (for
          example reminders, logs, planners, and emergency profile helpers), nearby-care discovery
          where available, and general health education (Learn / guides).
        </p>
        <ul className={styles.list}>
          <li>
            <strong>Not medical advice.</strong> CareMate does not diagnose, treat, prescribe, or
            replace advice from a qualified clinician, pharmacist, midwife, or emergency service.
          </li>
          <li>
            <strong>Not a medical device</strong> (unless SoftLyft later obtains a specific
            clearance or registration and updates these Terms). Features such as medication logs,
            period or pregnancy tracking, vitals entry, immunization records, and checkup planners
            are consumer tools for your own records and reminders — not clinical decision support.
          </li>
          <li>
            <strong>Not emergency services.</strong> In an emergency, contact local emergency
            numbers or the nearest appropriate facility. Patient ID / emergency share tools are
            optional aids and may be unavailable offline or without power or connectivity.
          </li>
          <li>
            <strong>Not an electronic health record for clinics</strong> and not a substitute for
            professional medical records kept by your providers.
          </li>
        </ul>
        <p>
          You are responsible for the accuracy of information you enter and for how you use it.
          Always verify medicines, doses, schedules, and clinical decisions with a qualified
          professional.
        </p>

        <h2>3. Eligibility and accounts</h2>
        <ul className={styles.list}>
          <li>
            You must be able to form a binding contract under applicable law. If you are under the
            age of majority where you live, you may use CareMate only with parent or guardian
            consent as required locally.
          </li>
          <li>
            You must provide accurate registration details and keep your credentials secure. You are
            responsible for activity under your account.
          </li>
          <li>
            Guest mode may offer limited features without an account. Premium, sync, family, and
            some other features require a signed-in account.
          </li>
          <li>
            SoftLyft may refuse, suspend, or terminate access for violations of these Terms, abuse,
            fraud, legal risk, or to protect users and the service.
          </li>
        </ul>

        <h2>4. Geographic scope and local laws</h2>
        <p>
          CareMate is designed with African users in mind (content, nearby care emphasis, and
          product priorities). Nigeria is SoftLyft&apos;s initial launch market. If you use CareMate
          from another country:
        </p>
        <ul className={styles.list}>
          <li>
            You are responsible for complying with laws that apply to you, including privacy, health
            information, consumer, and export rules.
          </li>
          <li>
            Features such as Nearby providers, local articles, languages, billing currency, and
            support may be optimized for Nigeria or selected African markets and may be limited or
            unavailable elsewhere.
          </li>
          <li>
            SoftLyft does not represent that CareMate meets healthcare product, medical-device, or
            privacy-law certifications for every jurisdiction (including, without limitation, US
            HIPAA &quot;compliance,&quot; EU GDPR certification, or other foreign regimes). See our{' '}
            <Link to="/privacy">Privacy policy</Link> for how we handle personal data.
          </li>
        </ul>

        <h2>5. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul className={styles.list}>
          <li>Misuse CareMate, probe or disrupt systems, or attempt unauthorized access</li>
          <li>Use CareMate to provide regulated clinical care to others as if SoftLyft were your
            EHR or telemedicine platform, unless SoftLyft offers a separate provider product under
            separate terms</li>
          <li>Upload unlawful, harmful, or infringing content</li>
          <li>Scrape, reverse engineer, or resell the service except as allowed by law</li>
          <li>Use CareMate in any way that violates applicable law</li>
        </ul>

        <h2>6. Subscriptions and payments</h2>
        <p>
          Paid CareMate plans (for example Premium or Family) are offered according to current
          pricing (see <Link to="/pricing">Pricing</Link>). You may subscribe via SoftLyft&apos;s
          hosted checkout (Paystack for Naira or USD, where offered) or through
          Apple App Store / Google Play billing in the mobile apps. Fees, renewals, taxes, and
          cancellations follow the flow shown at purchase. Refunds are described in our{' '}
          <Link to="/refunds">Refund policy</Link>. Store purchases are also subject to Apple&apos;s
          or Google&apos;s terms.
        </p>

        <h2>7. Intellectual property</h2>
        <p>
          CareMate, SoftLyft branding, software, and SoftLyft-authored content are owned by SoftLyft
          or its licensors. We grant you a limited, non-exclusive, non-transferable license to use
          CareMate for personal, non-commercial purposes in line with these Terms. You retain rights
          to the personal and health information you enter; you grant SoftLyft a license to host,
          process, and display that information solely to operate and improve CareMate as described
          in the Privacy policy.
        </p>

        <h2>8. Third-party services</h2>
        <p>
          CareMate relies on infrastructure and partners (for example cloud hosting, push
          notification delivery, email, analytics/crash reporting where enabled, maps or location
          services, and payment processors). Their services are governed by their own terms. SoftLyft
          is not responsible for third-party outages or policies beyond SoftLyft&apos;s reasonable
          control.
        </p>

        <h2>9. Availability and changes</h2>
        <p>
          We aim for reliable service but do not guarantee uninterrupted or error-free availability.
          Offline features depend on data stored on your device. We may modify, suspend, or
          discontinue features. We may update these Terms; the &quot;Last updated&quot; date will
          change. Material changes may be communicated in-app or by email where appropriate.
          Continued use after an update constitutes acceptance of the revised Terms, except where
          mandatory law requires otherwise.
        </p>

        <h2>10. Disclaimers</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, CareMate AND RELATED CONTENT ARE PROVIDED
          &quot;AS IS&quot; AND &quot;AS AVAILABLE,&quot; WITHOUT WARRANTIES OF ANY KIND, WHETHER
          EXPRESS, IMPLIED, OR STATUTORY, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR
          PURPOSE, AND NON-INFRINGEMENT. SoftLyft does not warrant that CareMate will meet your
          health outcomes or that educational content is complete or current for your situation.
        </p>

        <h2>11. Limitation of liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, SoftLyft AND ITS DIRECTORS, EMPLOYEES, AND
          SUPPLIERS WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
          DAMAGES, OR FOR LOSS OF DATA, PROFITS, OR GOODWILL, ARISING FROM YOUR USE OF CareMate.
          SoftLyft&apos;s aggregate liability for claims relating to CareMate will not exceed the
          greater of (a) the amounts you paid SoftLyft for CareMate subscriptions in the twelve (12)
          months before the claim or (b) USD 50 (or local currency equivalent), except where
          liability cannot be limited under applicable law (for example certain personal injury or
          fraud claims).
        </p>
        <p>
          Nothing in these Terms excludes liability that cannot be excluded under Nigerian law or
          other mandatory consumer protections that apply to you.
        </p>

        <h2>12. Indemnity</h2>
        <p>
          You agree to defend and indemnify SoftLyft against claims arising from your misuse of
          CareMate, your violation of these Terms, or your violation of law, to the extent permitted
          by applicable law.
        </p>

        <h2>13. Governing law and disputes</h2>
        <p>
          These Terms are governed by the laws of the <strong>Federal Republic of Nigeria</strong>,
          without regard to conflict-of-law rules. Subject to mandatory consumer rights in your
          country of residence, courts in Nigeria (and SoftLyft may designate a specific venue such
          as Lagos State with counsel&apos;s confirmation) have exclusive jurisdiction over disputes
          arising from these Terms or CareMate, except that SoftLyft may seek injunctive relief in
          any jurisdiction to protect its intellectual property or security.
        </p>

        <h2>14. Related policies</h2>
        <p>
          Your use of CareMate is also subject to our <Link to="/privacy">Privacy policy</Link>,{' '}
          <Link to="/security">Security overview</Link>, and{' '}
          <Link to="/refunds">Refund policy</Link> where applicable.
        </p>

        <h2>15. Contact</h2>
        <p>
          Questions about these Terms:{' '}
          <a href="mailto:hello@getcaremate.com">hello@getcaremate.com</a>
        </p>

        <p className={styles.meta}>
          Last updated: August 25, 2026 · Draft for counsel review — SoftLyft intends these Terms as
          a working baseline before formal legal finalization.
        </p>
        <p className={styles.back}>
          <Link to="/">← Back to CareMate</Link>
        </p>
      </article>
    </main>
  );
}
