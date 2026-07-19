import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { BRAND, PROVIDER_CAPABILITIES, PROVIDER_ORG_TYPES } from '@/lib/brand';
import styles from './Providers.module.css';

export function ProvidersPage() {
  return (
    <main>
      <section className={styles.hero} aria-labelledby="providers-heading">
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>For healthcare organizations</p>
          <h1 id="providers-heading">Stay connected with CareMate patients</h1>
          <p className={styles.lead}>
            The CareMate Provider Portal is a patient engagement channel — not an HMS or EHR. Keep
            your clinical systems. CareMate gives you a trusted way to connect with patients who
            already use the CareMate app.
          </p>
          <div className={styles.ctaRow}>
            <Link className={styles.ctaPrimary} to="/providers/guide">
              Read the provider guide
            </Link>
            <a className={styles.ctaSecondary} href="#capabilities">
              See what is included
            </a>
          </div>
        </div>
      </section>

      <section className={styles.strip} aria-label="Positioning">
        <div className={styles.stripInner}>
          <p>
            <strong>Not an EHR</strong>
            Your hospital, clinic, or pharmacy system stays primary
          </p>
          <p>
            <strong>Claim your listing</strong>
            Verify with the email already on the CareMate catalog
          </p>
          <p>
            <strong>Verified for patients</strong>
            Claimed organizations can accept Connect requests in the app
          </p>
        </div>
      </section>

      <section id="capabilities" className={styles.section} aria-labelledby="cap-heading">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>Capabilities</p>
          <h2 id="cap-heading">Built for relationship, not charting</h2>
          <p className={styles.sectionLead}>
            Every feature answers how you build and maintain trust with CareMate patients —
            connections, shared documents, broadcasts, and appointment requests.
          </p>
        </div>

        <div className={styles.capList}>
          {PROVIDER_CAPABILITIES.map((item, index) => (
            <article
              key={item.id}
              className={styles.capItem}
              style={
                {
                  '--accent': item.accent,
                  '--soft': item.soft,
                  '--delay': `${index * 40}ms`,
                } as CSSProperties
              }
            >
              <span className={styles.capIndex}>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.sectionAlt} aria-labelledby="types-heading">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>Who it is for</p>
          <h2 id="types-heading">Organization types on the portal</h2>
          <p className={styles.sectionLead}>
            Portal onboarding supports these organization types. Patients may still discover a wider
            set of Nearby labels in the CareMate app.
          </p>
        </div>
        <ul className={styles.typeGrid}>
          {PROVIDER_ORG_TYPES.map((type) => (
            <li key={type}>{type}</li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="how-heading">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>How it works</p>
          <h2 id="how-heading">From catalog listing to connected patients</h2>
        </div>
        <ol className={styles.steps}>
          <li>
            <strong>Appear in Nearby</strong>
            <span>
              SoftLyft ingests your organization into the CareMate catalog so patients can find you.
            </span>
          </li>
          <li>
            <strong>Claim your organization</strong>
            <span>
              Use the catalog contact email, verify with a code, set an admin password — your
              organization becomes verified for Connect.
            </span>
          </li>
          <li>
            <strong>Connect and engage</strong>
            <span>
              Request links by CareMate Patient ID, approve patient requests, then share documents,
              broadcasts, and appointment responses.
            </span>
          </li>
        </ol>
      </section>

      <section className={styles.closing} aria-labelledby="closing-heading">
        <div className={styles.closingInner}>
          <p className={styles.eyebrow}>Next step</p>
          <h2 id="closing-heading">Learn the portal end to end</h2>
          <p>
            The provider guide walks through claim, connections, rejection reasons, documents, and
            what CareMate does — and does not — replace.
          </p>
          <div className={styles.ctaRow}>
            <Link className={styles.ctaPrimaryDark} to="/providers/guide">
              Provider guide
            </Link>
            <Link className={styles.ctaSecondaryDark} to="/">
              CareMate for patients
            </Link>
          </div>
          <p className={styles.footnote}>
            {BRAND.name} Provider Portal is operated by SoftLyft. Patients download the CareMate app
            separately.
          </p>
        </div>
      </section>
    </main>
  );
}
